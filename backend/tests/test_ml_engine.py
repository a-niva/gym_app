# ===== backend/tests/test_ml_engine.py =====
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.database import Base
from backend.models import User, Exercise
from backend.ml_engine import FitnessMLEngine

@pytest.fixture
def test_db():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()
    yield db
    db.close()

def test_calculate_starting_weight(test_db):
    # Créer un utilisateur test
    user = User(
        name="Test User",
        age=25,
        experience_level="intermediate",
        goals=["strength", "hypertrophy"],
        available_equipment=["dumbbells", "barbell"],
        dumbbell_weights=[5, 10, 15, 20]
    )
    test_db.add(user)
    
    # Créer un exercice test
    exercise = Exercise(
        name_fr="Développé couché",
        name_eng="Bench Press",
        equipment=["barbell"],
        level="basic",
        body_part="Pectoraux",
        sets_reps=[{"level": "intermediate", "sets": 4, "reps": 8}]
    )
    test_db.add(exercise)
    test_db.commit()
    
    # Tester le calcul
    ml_engine = FitnessMLEngine(test_db)
    weight = ml_engine.calculate_starting_weight(user, exercise)
    
    assert weight > 0
    assert weight % 2.5 == 0  # Arrondi à 2.5kg

def test_injury_risk_analysis(test_db):
    user = User(name="Test", age=30, experience_level="advanced")
    test_db.add(user)
    test_db.commit()
    
    ml_engine = FitnessMLEngine(test_db)
    risk_analysis = ml_engine.analyze_injury_risk(user)
    
    assert risk_analysis["risk_level"] in ["low", "medium", "high"]
    assert len(risk_analysis["recommendations"]) > 0