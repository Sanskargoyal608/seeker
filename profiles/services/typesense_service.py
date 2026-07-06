import typesense
from django.conf import settings
import logging

logger = logging.getLogger(__name__)

class TypesenseService:
    def __init__(self):
        self.client = typesense.Client({
            'nodes': [{
                'host': getattr(settings, 'TYPESENSE_HOST', 'typesense'),
                'port': getattr(settings, 'TYPESENSE_PORT', '8108'),
                'protocol': 'http'
            }],
            'api_key': getattr(settings, 'TYPESENSE_API_KEY', 'local-typesense-key'),
            'connection_timeout_seconds': 2
        })
        self.collection_name = 'therapists'

    def init_collection(self):
        schema = {
            'name': 'therapists',
            'fields': [
                {'name': 'id', 'type': 'string'},
                {'name': 'name', 'type': 'string'},
                {'name': 'bio', 'type': 'string', 'optional': True},
                {'name': 'per_session_rate', 'type': 'float', 'facet': True},
                {'name': 'languages', 'type': 'string[]', 'facet': True, 'optional': True},
                {'name': 'modalities', 'type': 'string[]', 'facet': True, 'optional': True},
            ]
        }

        try:
            self.client.collections[self.collection_name].retrieve()
            logger.info(f"Collection {self.collection_name} already exists.")
        except typesense.exceptions.ObjectNotFound:
            self.client.collections.create(schema)
            logger.info(f"Collection {self.collection_name} created.")
        except Exception as e:
            logger.error(f"Error checking/creating collection: {e}")

    def upsert_therapist(self, therapist):
        if not therapist.is_verified:
            # If not verified, remove from search index if exists
            self.delete_therapist(therapist.id)
            return

        document = {
            'id': str(therapist.id),
            'name': f"{therapist.user.first_name} {therapist.user.last_name}".strip(),
            'bio': therapist.bio or "",
            'per_session_rate': float(therapist.per_session_rate),
            'languages': therapist.languages or [],
            'modalities': therapist.modalities or [],
        }

        try:
            self.client.collections[self.collection_name].documents.upsert(document)
        except Exception as e:
            logger.error(f"Failed to upsert therapist {therapist.id} to Typesense: {e}")

    def delete_therapist(self, therapist_id):
        try:
            self.client.collections[self.collection_name].documents[str(therapist_id)].delete()
        except typesense.exceptions.ObjectNotFound:
            pass # Already not there
        except Exception as e:
            logger.error(f"Failed to delete therapist {therapist_id} from Typesense: {e}")

    def search_therapists(self, query="*", filters=None, sort_by=None, page=1, per_page=20):
        search_parameters = {
            'q': query,
            'query_by': 'name,bio,languages,modalities',
            'page': page,
            'per_page': per_page
        }

        if filters:
            search_parameters['filter_by'] = filters
            
        if sort_by:
            search_parameters['sort_by'] = sort_by

        try:
            return self.client.collections[self.collection_name].documents.search(search_parameters)
        except Exception as e:
            logger.error(f"Typesense search error: {e}")
            return {'hits': [], 'found': 0, 'page': 1}
