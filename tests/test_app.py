from copy import deepcopy

import pytest
from fastapi.testclient import TestClient

import src.app as app_module


@pytest.fixture
def client():
    with TestClient(app_module.app) as test_client:
        yield test_client


@pytest.fixture(autouse=True)
def restore_activities():
    original_activities = deepcopy(app_module.activities)
    yield
    app_module.activities.clear()
    app_module.activities.update(original_activities)


def test_get_activities_returns_all_activities(client):
    # Arrange
    expected_activities = deepcopy(app_module.activities)

    # Act
    response = client.get("/activities")

    # Assert
    assert response.status_code == 200
    assert response.json() == expected_activities


def test_signup_adds_participant(client):
    # Arrange
    activity_name = "Chess Club"
    email = "new-student@mergington.edu"
    expected_participants = app_module.activities[activity_name]["participants"] + [email]

    # Act
    response = client.post(
        f"/activities/{activity_name}/signup",
        params={"email": email},
    )

    # Assert
    assert response.status_code == 200
    assert email in response.json()["message"]
    assert app_module.activities[activity_name]["participants"] == expected_participants


def test_duplicate_signup_is_rejected_without_mutation(client):
    # Arrange
    activity_name = "Chess Club"
    email = app_module.activities[activity_name]["participants"][0]
    original_activities = deepcopy(app_module.activities)

    # Act
    response = client.post(
        f"/activities/{activity_name}/signup",
        params={"email": email},
    )

    # Assert
    assert response.status_code == 400
    assert app_module.activities == original_activities


def test_signup_for_unknown_activity_returns_404(client):
    # Arrange
    original_activities = deepcopy(app_module.activities)

    # Act
    response = client.post(
        "/activities/Unknown%20Activity/signup",
        params={"email": "student@mergington.edu"},
    )

    # Assert
    assert response.status_code == 404
    assert app_module.activities == original_activities


def test_unregister_removes_only_requested_participant(client):
    # Arrange
    activity_name = "Chess Club"
    email = app_module.activities[activity_name]["participants"][0]
    expected_activities = deepcopy(app_module.activities)
    expected_activities[activity_name]["participants"].remove(email)

    # Act
    response = client.delete(
        f"/activities/{activity_name}/signup",
        params={"email": email},
    )

    # Assert
    assert response.status_code == 200
    assert email in response.json()["message"]
    assert app_module.activities == expected_activities


def test_unregister_for_unknown_activity_returns_404(client):
    # Arrange
    original_activities = deepcopy(app_module.activities)

    # Act
    response = client.delete(
        "/activities/Unknown%20Activity/signup",
        params={"email": "student@mergington.edu"},
    )

    # Assert
    assert response.status_code == 404
    assert app_module.activities == original_activities


def test_unregister_missing_participant_returns_404_without_mutation(client):
    # Arrange
    activity_name = "Chess Club"
    original_activities = deepcopy(app_module.activities)

    # Act
    response = client.delete(
        f"/activities/{activity_name}/signup",
        params={"email": "not-registered@mergington.edu"},
    )

    # Assert
    assert response.status_code == 404
    assert app_module.activities == original_activities


def test_root_redirects_to_static_index(client):
    # Arrange
    expected_location = "/static/index.html"

    # Act
    response = client.get("/", follow_redirects=False)

    # Assert
    assert response.status_code == 307
    assert response.headers["location"] == expected_location


@pytest.mark.parametrize("asset", ["index.html", "app.js", "styles.css"])
def test_static_assets_are_served(client, asset):
    # Arrange
    path = f"/static/{asset}"

    # Act
    response = client.get(path)

    # Assert
    assert response.status_code == 200
    assert response.content