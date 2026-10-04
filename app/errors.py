"""The one exception the HTTP layer turns into a JSON error response."""


class ApiError(Exception):
    def __init__(self, status, message):
        super().__init__(message)
        self.status, self.message = status, message
