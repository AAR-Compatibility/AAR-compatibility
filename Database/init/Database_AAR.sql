/*This script in combination with the python script "AAR_excel_to_sql" and the excel file
"" creates the SQL database necessary for the AAR compatibility software*/
----------------------------------------------------------------------------------
--CREATE DATABASE aar_comp_2;


/*The tabel with all tankers*/
CREATE TABLE IF NOT EXISTS tankers(
	ID SERIAL PRIMARY KEY,
	"nation" TEXT,
	"type" TEXT,
	"model" TEXT	
);

SELECT setval('tankers_id_seq', (SELECT MAX(id) FROM tankers));

----------------------------------------------------------------------------------
/*The table with all the receivers*/
CREATE TABLE IF NOT EXISTS receivers(
	ID SERIAL PRIMARY KEY,
	"nation" TEXT,
	"type" TEXT,
	"model" TEXT
);

CREATE UNIQUE INDEX ON tankers (nation, type, model);
CREATE UNIQUE INDEX ON receivers (nation, type, model);

SELECT setval('receivers_id_seq', (SELECT MAX(id) FROM receivers));

----------------------------------------------------------------------------------
/*This table is not in the excel file and creates all possible combinations of tanker and receiver*/
DROP TABLE IF EXISTS compatibility;
CREATE TABLE compatibility (
	id SERIAL PRIMARY KEY,	
	tanker_id INTEGER NOT NULL REFERENCES tankers(id) ON DELETE CASCADE,
	receiver_id INTEGER NOT NULL REFERENCES receivers(id) ON DELETE CASCADE,
	UNIQUE (tanker_id, receiver_id));

SELECT setval('compatibility_id_seq', (SELECT MAX(id) FROM compatibility));

-- INSERT INTO compatibility (tanker_id, receiver_id)
-- 	SELECT t.id, r.id
-- 	FROM tankers t
-- 	CROSS JOIN receivers r
-- 	ON CONFLICT (tanker_id, receiver_id) DO NOTHING;
	
DROP TABLE IF EXISTS specifications;---------------------------------------------------------------------------------
CREATE TABLE specifications (
    id SERIAL PRIMARY KEY,
    compatibility_id INT NOT NULL REFERENCES compatibility(id) ON DELETE CASCADE,
	c_tanker TEXT,
	c_receiver TEXT,
	v_srd_tanker TEXT,
	v_srd_receiver TEXT,
    boom_pod_bda TEXT,
    min_alt INT,
    max_alt INT,
    min_as INT,
    max_as_kcas INT,
	max_as_m INT,
    fuel_flow_rate INT,
    notes TEXT
);


INSERT INTO specifications (compatibility_id, c_tanker, c_receiver, v_srd_tanker, v_srd_receiver, boom_pod_bda, min_alt, max_alt, min_as, max_as_kcas, max_as_m, fuel_flow_rate, notes)
SELECT c.id, s.c_tanker, s.c_receiver, s.v_srd_tanker, s.v_srd_receiver, s.boom_pod_bda, s.min_alt, s.max_alt, s.min_as, s.max_as_kcas, s.max_as_m, s.fuel_flow_rate, s.notes
FROM specifications s
JOIN tankers t 
	ON s.tanker_model = t.model 
	AND s.tanker_nation = t.nation
	AND s.tanker_type = t.type
JOIN receivers r 
	ON s.receiver_model = r.model 
	AND s.receiver_nation = r.nation
	AND s.receiver_type = r.type
JOIN compatibility c 
	ON c.tanker_id = t.id 
	AND c.receiver_id = r.id;

	----------------------------------------------------------------------------------
	--Create Rol en userID table---

	----------------------------------------------------
-- Roles table
CREATE TABLE IF NOT EXISTS "Rol" (
  "RolID" SERIAL PRIMARY KEY,
  "name" VARCHAR(255) NOT NULL UNIQUE
);

----------------------------------------------------
-- Users table
CREATE TABLE IF NOT EXISTS "User" (
  "UserID" SERIAL PRIMARY KEY,
  "name" VARCHAR(255) NOT NULL,
  "email" VARCHAR(255) NOT NULL UNIQUE,
  "RolRolID" INT NOT NULL REFERENCES "Rol"("RolID"),
  "password_hash" VARCHAR(255) NOT NULL
);

----------------------------------------------------
-- Insert roles
INSERT INTO "Rol" ("name")
VALUES ('admin'), ('srd_holder'), ('viewer')
ON CONFLICT ("name") DO NOTHING;

----------------------------------------------------
-- Insert users with hash

INSERT INTO "User" ("name","email","RolRolID","password_hash")
VALUES
('Admin','admin@japcc.com',
 (SELECT "RolID" FROM "Rol" WHERE "name"='admin'),
 '$2b$10$egRYV7eGB6EDFF7JGIsvzOUbXlz3ta2nO8LrWyvXhn4b3pu6gR4hS'),

('SRD_Holder','srd@mindef.com',
 (SELECT "RolID" FROM "Rol" WHERE "name"='srd_holder'),
 '$2b$10$egRYV7eGB6EDFF7JGIsvzOUbXlz3ta2nO8LrWyvXhn4b3pu6gR4hS'),

('Viewer','viewer@japcc.com',
 (SELECT "RolID" FROM "Rol" WHERE "name"='viewer'),
 '$2b$10$egRYV7eGB6EDFF7JGIsvzOUbXlz3ta2nO8LrWyvXhn4b3pu6gR4hS')
ON CONFLICT ("email") DO NOTHING;
