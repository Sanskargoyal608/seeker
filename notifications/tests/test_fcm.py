import pytest
from unittest.mock import patch
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from accounts.models import User
from notifications.models import UserDevice
from notifications.services.fcm_service import NotificationService

@pytest.fixture
def api_client():
    return APIClient()

@pytest.fixture
def test_user(db):
    user = User.objects.create_user(
        username='testuser',
        email='testuser@example.com',
        password='password123',
        role=User.GENERAL_USER,
        first_name='Test',
        last_name='User'
    )
    return user

@pytest.fixture
def auth_client(api_client, test_user):
    from rest_framework_simplejwt.tokens import RefreshToken
    refresh = RefreshToken.for_user(test_user)
    api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
    return api_client

@pytest.mark.django_db
def test_register_device(auth_client, test_user):
    url = reverse('device-register')
    
    # Register new device
    data = {
        'fcm_token': 'token_12345',
        'platform': 'IOS'
    }
    response = auth_client.post(url, data, format='json')
    assert response.status_code == status.HTTP_200_OK
    assert response.data['status'] == 'Device registered'
    
    # Check DB
    assert UserDevice.objects.filter(user=test_user, fcm_token='token_12345', platform='IOS').exists()
    
    # Register again with same token (should update)
    response = auth_client.post(url, data, format='json')
    assert response.status_code == status.HTTP_200_OK
    assert UserDevice.objects.filter(user=test_user, fcm_token='token_12345').count() == 1

@pytest.mark.django_db
@patch('notifications.services.fcm_service.firebase_admin._apps', return_value=True) # Mock apps to simulate initialized state
@patch('notifications.services.fcm_service.messaging.send_each_for_multicast')
def test_send_push_notification_success(mock_send_multicast, mock_apps, test_user):
    # Setup devices
    UserDevice.objects.create(user=test_user, fcm_token='token_1', platform='IOS')
    UserDevice.objects.create(user=test_user, fcm_token='token_2', platform='ANDROID')
    
    class MockResponse:
        success_count = 2
        failure_count = 0
        responses = []

    mock_send_multicast.return_value = MockResponse()
    
    res = NotificationService.send_push_notification(
        user=test_user,
        title="Test Title",
        body="Test Body",
        data={'test': 'data'}
    )
    
    assert res['success'] == 2
    assert res['failure'] == 0
    mock_send_multicast.assert_called_once()
    
    # Verify the message payload
    call_args = mock_send_multicast.call_args[0]
    message = call_args[0]
    assert message.notification.title == "Test Title"
    assert message.notification.body == "Test Body"
    assert message.data == {'test': 'data'}
    assert set(message.tokens) == {'token_1', 'token_2'}

@pytest.mark.django_db
@patch('notifications.services.fcm_service.firebase_admin._apps', return_value=True)
@patch('notifications.services.fcm_service.messaging.send_each_for_multicast')
def test_send_push_notification_failure_cleanup(mock_send_multicast, mock_apps, test_user):
    UserDevice.objects.create(user=test_user, fcm_token='token_valid', platform='IOS')
    UserDevice.objects.create(user=test_user, fcm_token='token_invalid', platform='ANDROID')
    
    class MockResult:
        def __init__(self, success):
            self.success = success

    class MockResponse:
        success_count = 1
        failure_count = 1
        responses = [MockResult(True), MockResult(False)]

    mock_send_multicast.return_value = MockResponse()
    
    res = NotificationService.send_push_notification(
        user=test_user,
        title="Test Title",
        body="Test Body"
    )
    
    assert res['success'] == 1
    assert res['failure'] == 1
    
    # Check if invalid token was cleaned up
    assert UserDevice.objects.get(fcm_token='token_valid').is_active is True
    assert UserDevice.objects.get(fcm_token='token_invalid').is_active is False
