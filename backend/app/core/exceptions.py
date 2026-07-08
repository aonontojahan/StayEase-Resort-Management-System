from fastapi import HTTPException, status


class StayEaseException(Exception):
    """Base exception for all StayEase custom errors."""
    def __init__(self, message: str, status_code: int = status.HTTP_400_BAD_REQUEST):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


class NotFoundException(StayEaseException):
    """Exception raised when a resource is not found."""
    def __init__(self, message: str = "Resource not found"):
        super().__init__(message, status_code=status.HTTP_404_NOT_FOUND)


class UnauthorizedException(StayEaseException):
    """Exception raised when authentication fails."""
    def __init__(self, message: str = "Incorrect credentials or expired token"):
        super().__init__(message, status_code=status.HTTP_401_UNAUTHORIZED)


class ForbiddenException(StayEaseException):
    """Exception raised when a user does not have permissions."""
    def __init__(self, message: str = "You do not have permission to perform this action"):
        super().__init__(message, status_code=status.HTTP_403_FORBIDDEN)


class BadRequestException(StayEaseException):
    """Exception raised for invalid input or operations."""
    def __init__(self, message: str = "Invalid request"):
        super().__init__(message, status_code=status.HTTP_400_BAD_REQUEST)
