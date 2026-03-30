import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";

function loadConfig() {
	return {
		host: process.env.HOST || "0.0.0.0",
		port: Number(process.env.PORT || "8080"),
		database: {
			host: process.env.MYSQL_HOST || "127.0.0.1",
			port: Number(process.env.MYSQL_PORT || "3306"),
			user: process.env.MYSQL_USER || "root",
			password: process.env.MYSQL_PASSWORD || "",
			database: process.env.MYSQL_DATABASE || "vatsim_monitor"
		}
	};
}

async function run() {
	const config = loadConfig();
	const connection = await mysql.createConnection({
		host: config.database.host,
		port: config.database.port,
		user: config.database.user,
		password: config.database.password,
		multipleStatements: true
	});

	await connection.query(`CREATE DATABASE IF NOT EXISTS \`${config.database.database}\``);
	await connection.query(`USE \`${config.database.database}\``);

	await connection.query(`
		CREATE TABLE IF NOT EXISTS schema_migrations (
			id VARCHAR(255) NOT NULL,
			applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			PRIMARY KEY (id)
		)
	`);

	const currentFile = fileURLToPath(import.meta.url);
	const currentDir = path.dirname(currentFile);
	const migrationsDir = path.resolve(currentDir, "../../../packages/data/migrations");
	const files = (await readdir(migrationsDir)).filter((file) => file.endsWith(".sql")).sort();

	for (const file of files) {
		const [rows] = await connection.query("SELECT id FROM schema_migrations WHERE id = ?", [file]);
		if (Array.isArray(rows) && rows.length > 0) {
			continue;
		}

		const sql = await readFile(path.join(migrationsDir, file), "utf8");
		console.log(`Applying migration ${file}`);
		await connection.query(sql);
		await connection.query("INSERT INTO schema_migrations (id) VALUES (?)", [file]);
	}

	await connection.end();
	console.log("Migrations complete");
}

run().catch((error) => {
	console.error(error);
	process.exit(1);
});
