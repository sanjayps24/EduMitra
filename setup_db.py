from database import engine
from models import Admin, Student, AcademicRecord, Base
from sqlalchemy import inspect

def setup():
    print("📡 Initializing database setup...")
    inspector = inspect(engine)
    existing_tables = inspector.get_table_names()
    print(f"Existing tables: {existing_tables}")

    tables_to_create = []
    
    if "admins" not in existing_tables:
        print("Adding 'admins' to creation list...")
        tables_to_create.append(Admin.__table__)
    if "students" not in existing_tables:
        print("Adding 'students' to creation list...")
        tables_to_create.append(Student.__table__)
    if "academic_records" not in existing_tables:
        print("Adding 'academic_records' to creation list...")
        tables_to_create.append(AcademicRecord.__table__)

    if tables_to_create:
        print(f"🔨 Creating {len(tables_to_create)} missing tables...")
        Base.metadata.create_all(bind=engine, tables=tables_to_create)
        print("✅ Missing tables created successfully.")
    else:
        print("✅ All tables already exist.")

if __name__ == "__main__":
    setup()
