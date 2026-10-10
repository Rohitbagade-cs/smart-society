"""Project-wide DRF pagination: honors ?page_size= (capped), defaults to 20."""

from rest_framework.pagination import PageNumberPagination


class StandardPagination(PageNumberPagination):
    page_size_query_param = "page_size"
    max_page_size = 200
