from dataclasses import dataclass
from enum import Enum

class Decision(str, Enum):
    ALLOW = "ALLOW"
    DENY = "DENY"
    CONFIRM = "CONFIRM"

@dataclass
class PolicyResult:
    decision: Decision
    reason: str

class PolicyEngine:
    READ_ONLY = {
        "search_emails",
        "get_unread_emails",
        "get_sent_emails",
        "get_received_emails",
        "get_draft_emails",
        "search_contacts_by_name",
        "search_contacts_by_email",
        "get_current_day",
        "search_calendar_events",
        "get_day_calendar_events",
        "search_files_by_filename",
        "get_file_by_id",
        "list_files",
        "search_files",
    }

    SENSITIVE = {
        "send_email",
        "delete_email",
        "create_calendar_event",
        "cancel_calendar_event",
        "reschedule_calendar_event",
        "add_calendar_event_participants",
        "append_to_file",
        "create_file",
        "delete_file",
        "share_file",
    }

    def evaluate(self, tool_name: str, arguments: dict) -> PolicyResult:
        if tool_name in self.READ_ONLY:
            return PolicyResult(Decision.ALLOW, "Read-only tool")

        if tool_name in self.SENSITIVE:
            return PolicyResult(
                Decision.CONFIRM,
                "Sensitive action requires explicit authorization",
            )

        return PolicyResult(Decision.DENY, "Unknown tool")
