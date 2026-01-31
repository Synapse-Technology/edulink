from django.test import TestCase
from .services import record_event
from .models import LedgerEvent
import uuid

class LedgerChainTests(TestCase):
    def test_hash_chaining(self):
        entity_id = uuid.uuid4()
        actor_id = uuid.uuid4()
        
        # 1. Create First Event
        event1 = record_event(
            event_type="TEST_EVENT_1",
            actor_id=actor_id,
            entity_id=entity_id,
            entity_type="TestEntity",
            actor_role="student",
            payload={"step": 1}
        )
        
        self.assertTrue(event1.hash)
        self.assertIsNone(event1.previous_hash)
        self.assertEqual(event1.actor_role, "student")
        
        # 2. Create Second Event
        event2 = record_event(
            event_type="TEST_EVENT_2",
            actor_id=actor_id,
            entity_id=entity_id,
            entity_type="TestEntity",
            actor_role="supervisor",
            payload={"step": 2}
        )
        
        self.assertTrue(event2.hash)
        self.assertEqual(event2.previous_hash, event1.hash)
        self.assertNotEqual(event2.hash, event1.hash)
        self.assertEqual(event2.actor_role, "supervisor")
        
        # 3. Create Third Event
        event3 = record_event(
            event_type="TEST_EVENT_3",
            actor_id=actor_id,
            entity_id=entity_id,
            entity_type="TestEntity",
            payload={"step": 3}
        )
        
        self.assertEqual(event3.previous_hash, event2.hash)
        
        # 4. Verify separate entity doesn't mix
        other_entity_id = uuid.uuid4()
        event_other = record_event(
            event_type="TEST_EVENT_OTHER",
            actor_id=actor_id,
            entity_id=other_entity_id,
            entity_type="TestEntity",
            payload={"step": 1}
        )
        
        self.assertIsNone(event_other.previous_hash)
