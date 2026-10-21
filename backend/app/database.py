from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import DeclarativeBase, sessionmaker

DATABASE_URL = "sqlite:///./irrigation.db"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},
)


class Base(DeclarativeBase):
    pass


SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    autocommit=False,
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def ensure_schema_extensions():
    additions = {
        "users": {
            "assigned_village_id": "INTEGER REFERENCES villages(id)",
        },
        "irrigation_data": {
            "created_by_id": "INTEGER REFERENCES users(id)",
            "validation_status": "VARCHAR(20) NOT NULL DEFAULT 'validated'",
            "validated_by_id": "INTEGER REFERENCES users(id)",
            "water_demand_m3": "FLOAT",
        },
    }
    inspector = inspect(engine)
    existing_tables = set(inspector.get_table_names())

    with engine.begin() as connection:
        for table_name, columns in additions.items():
            if table_name not in existing_tables:
                continue
            existing_columns = {
                column["name"] for column in inspect(connection).get_columns(table_name)
            }
            for column_name, column_definition in columns.items():
                if column_name not in existing_columns:
                    connection.execute(
                        text(
                            f"ALTER TABLE {table_name} ADD COLUMN "
                            f"{column_name} {column_definition}"
                        )
                    )
