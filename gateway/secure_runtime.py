import json
from datetime import datetime, timezone
from pathlib import Path

from agentdojo.functions_runtime import FunctionsRuntime
from gateway.policy_engine import PolicyEngine, Decision


class SecureFunctionsRuntime(FunctionsRuntime):
    audit_path = Path("results/gateway_audit.jsonl")

    def __init__(self, functions=()):
        super().__init__(functions)
        self.policy = PolicyEngine()
        self.audit_path.parent.mkdir(parents=True, exist_ok=True)

    def run_function(self, env, function, kwargs, raise_on_error=False):
        print(f"GATEWAY INTERCEPTED: {function}", flush=True)

        decision = self.policy.evaluate(function, dict(kwargs))

        record = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "tool": function,
            "decision": decision.decision.value,
            "reason": decision.reason,
        }

        with self.audit_path.open("a", encoding="utf-8") as file:
            file.write(json.dumps(record) + "\n")

        if decision.decision != Decision.ALLOW:
            return None, (
                f"SECURITY_GATEWAY_BLOCKED: "
                f"{decision.decision.value}. {decision.reason}"
            )

        return super().run_function(
            env, function, kwargs, raise_on_error=raise_on_error
        )
