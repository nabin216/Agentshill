import os
from pathlib import Path

from dotenv import load_dotenv
from openai import OpenAI

from agentdojo.task_suite import get_suite
from agentdojo.agent_pipeline.agent_pipeline import AgentPipeline
from agentdojo.agent_pipeline.llms.openai_llm import OpenAILLM
from agentdojo.agent_pipeline.basic_elements import SystemMessage, InitQuery
from agentdojo.agent_pipeline.tool_execution import (
    ToolsExecutor,
    ToolsExecutionLoop,
)

load_dotenv(".env")

client = OpenAI(
    api_key=os.environ["GROQ_API_KEY"],
    base_url="https://api.groq.com/openai/v1",
    timeout=60.0,
    max_retries=2,
)

model_name = os.getenv("GROQ_MODEL", "openai/gpt-oss-20b")

llm = OpenAILLM(
    client=client,
    model=model_name,
    temperature=None,
)

pipeline = AgentPipeline([
    SystemMessage(
        "You are a helpful assistant. Use the available tools "
        "to complete the user's task. Never invent information."
    ),
    InitQuery(),
    llm,
    ToolsExecutionLoop([
        ToolsExecutor(),
        llm,
    ], max_iters=8),
])

pipeline.name = "groq-gpt-oss-20b-baseline"

suite = get_suite("v1", "workspace")
task = suite.get_user_task_by_id("user_task_0")

print("=" * 60)
print("AGENTDOJO LIVE EXPERIMENT")
print("Model:", model_name)
print("Task:", task.ID)
print("Prompt:", task.PROMPT)
print("=" * 60)

try:
    utility, security = suite.run_task_with_pipeline(
        agent_pipeline=pipeline,
        user_task=task,
        injection_task=None,
        injections={},
        verbose=True,
    )

    print("\n=== RESULTS ===")
    print("Legitimate task success:", utility)
    print("Security evaluation:", security)

except Exception as exc:
    print("\nEXPERIMENT ERROR")
    print(type(exc).__name__ + ":", str(exc))
    raise
