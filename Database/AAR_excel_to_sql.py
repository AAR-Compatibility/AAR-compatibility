import pandas as pd
import os
from sqlalchemy import create_engine, text
engine = create_engine('postgresql://postgres:ikwillerencoderen156@localhost:5432/aar_comp_2')
BASE_DIR = os.path.dirname(__file__)
excel_path = os.path.join(BASE_DIR, "AAR_matrix_2.xlsx")

create_tables_sql = """
CREATE TABLE IF NOT EXISTS tankers(
    id SERIAL PRIMARY KEY,
    nation TEXT,
    type TEXT,
    model TEXT
);
CREATE TABLE IF NOT EXISTS receivers(
    id SERIAL PRIMARY KEY,
    nation TEXT,
    type TEXT,
    model TEXT
);
CREATE TABLE IF NOT EXISTS compatibility (
    id SERIAL PRIMARY KEY,
    tanker_id INTEGER NOT NULL REFERENCES tankers(id) ON DELETE CASCADE,
    receiver_id INTEGER NOT NULL REFERENCES receivers(id) ON DELETE CASCADE,
    UNIQUE (tanker_id, receiver_id)
);
"""
# Read Excel sheets
tankers_excel = pd.read_excel(excel_path, sheet_name=0)
receivers_excel = pd.read_excel(excel_path, sheet_name=1)
specifications_excel = pd.read_excel(excel_path, sheet_name=2)

with engine.begin() as conn:
    # 1 Ensure tables exist
    conn.execute(text(create_tables_sql))
    # 2 Clear old data
    conn.execute(text("""
                      TRUNCATE tankers, receivers, compatibility 
                      RESTART IDENTITY CASCADE;
                      """))

    print("Tables cleared")

    # 3 Upload tankers and receivers
    tankers_excel.to_sql('tankers', conn, if_exists='append', index=False)
    receivers_excel.to_sql('receivers', conn, if_exists='append', index=False)
    print("Tankers and receivers inserted")
    # 4 Generate compatibility matrix
    conn.execute(text("""
        INSERT INTO compatibility (tanker_id, receiver_id)
        SELECT t.id, r.id
        FROM tankers t
        CROSS JOIN receivers r
        ON CONFLICT (tanker_id, receiver_id) DO NOTHING;
    """))
    print("Compatibility matrix generated")
    # 5 Read IDs back
    df_tankers = pd.read_sql(
        "SELECT id as tanker_id, nation, type, model FROM tankers", conn
    )
    df_receivers = pd.read_sql(
        "SELECT id as receiver_id, nation, type, model FROM receivers", conn
    )
    df_comp = pd.read_sql(
        "SELECT id as compatibility_id, tanker_id, receiver_id FROM compatibility", conn
    )
    # 6 Merge specifications with IDs
    specs_with_ids = specifications_excel.merge(
        df_tankers,
        left_on=['tanker_nation', 'tanker_type', 'tanker_model'],
        right_on=['nation', 'type', 'model']
    )
    specs_with_ids = specs_with_ids.merge(
    df_receivers,
        left_on=['receiver_nation', 'receiver_type', 'receiver_model'],
        right_on=['nation', 'type', 'model']
    )
    final_specs = specs_with_ids.merge(
        df_comp,
        on=['tanker_id', 'receiver_id']
    )
    columns_to_keep = [
        'compatibility_id',
        'c_tanker',
        'c_receiver',
        'v_srd_tanker',
        'v_srd_receiver',
        'boom_pod_bda',
        'min_alt',
        'max_alt',
        'min_as',
        'max_as_kcas',
        'max_as_m',
        'fuel_flow_rate',
        'notes'
    ]
    final_specs[columns_to_keep].to_sql(    
        'specifications',
        conn,
        if_exists='append',
        index=False
    )

print("Excel sheets successfully written to PostgreSQL!")