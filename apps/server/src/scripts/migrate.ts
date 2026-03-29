import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createConnection } from "mysql2/promise";
import { loadConfig } from "../config.js";

async function run() {
	const config = loadConfig();
	const connection = await createConnection({
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
	const migrationsDir = path.resolve(currentDir, "../../../../packages/data/migrations");
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
