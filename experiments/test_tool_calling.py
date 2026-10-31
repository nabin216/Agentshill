import os
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv(".env")

client = OpenAI(
    api_key=os.environ["GROQ_API_KEY"],
    base_url="https://api.groq.com/openai/v1",
)

tools = [
    {
        "type": "function",
        "function": {
            "name": "search_emails",
            "description": "Search the user's emails",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Email search query"
                    }
                },
                "required": ["query"]
            }
        }
    }
]

response = client.chat.completions.create(
    model=os.environ["GROQ_MODEL"],
    messages=[
        {
            "role": "system",
            "content": "You are an assistant with access to email tools."
        },
        {
            "role": "user",
            "content": "Search my emails for the project meeting."
        }
    ],
    tools=tools,
    tool_choice="auto",
    max_tokens=300,
)

message = response.choices[0].message

print("MODEL:", response.model)
print("TOOL CALLS:", message.tool_calls)

if message.tool_calls:
    print("\nSUCCESS: Model requested a tool.")
else:
    print("\nModel did not request a tool.")
