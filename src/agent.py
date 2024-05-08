import os
import json
from typing import List, Tuple

from langchain.agents import AgentExecutor
from langchain.agents.format_scratchpad import format_log_to_messages
from langchain.agents.output_parsers import (
    ReActJsonSingleInputOutputParser,
)
from langchain.prompts import ChatPromptTemplate, MessagesPlaceholder, SystemMessagePromptTemplate
from langchain.pydantic_v1 import BaseModel, Field
from langchain.tools.render import render_text_description_and_args
from langchain_community.chat_models import ChatOllama
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage

from langchain_community.tools import DuckDuckGoSearchRun, DuckDuckGoSearchResults
from modules.timetool import DateTimeTool
from modules.page_summary import PageSummaryTool
from modules.python_repl import repl_tool

import os
import urllib.parse

# llm = ChatOllama(
#     model=os.environ.get("AI_MODEL"),
#     temperature=0,
#     base_url=os.environ["OLLAMA_BASE_URL"],
#     streaming=True,
# )
# Just me testing
from langchain_community.chat_models import ChatOpenAI

TOOLS = {"web_search": DuckDuckGoSearchResults(), "page_summary": PageSummaryTool, "clock": DateTimeTool(), "python_repl": repl_tool}

with open(os.path.join(os.environ.get("DATA_PATH"), "agent_data.json"), 'r') as f:
    AGENT = json.load(f)["sydney"]


def make_system_prompt(tools):
    
    # Inspiration taken from hub.pull("hwchase17/react-json")
    with open(os.path.join(os.environ.get("DATA_PATH"), "prompts", AGENT["prompt"]), 'r') as f:
        data = f.read()
        
    data = data.replace("$DESCRIPTION_ARGS", render_text_description_and_args(tools).replace('{', '{{').replace('}', '}}'))
    data = data.replace("$ACTION_ARGS", str([t.name for t in tools]))
    
    return data
    

def get_user_data():
    with open(os.path.join(os.environ.get("DATA_PATH"), "userdata.json"), 'r') as f:
        data = json.load(f)
    return "\n".join([f"{k}: {v}" for k, v in data["context"].items()])


def _format_chat_history(chat_history: List[Tuple[str, str]]):
    buffer = []
    for author, content in chat_history:
            buffer.append({"human": HumanMessage, "ai": AIMessage, "system": SystemMessage}[author](content=content))
    return buffer

def _format_enviroment(enviroment):
    return ["{}/files/{}".format(os.environ.get("HOST"), urllib.parse.quote(x)) for x in enviroment]

# Add typing for input
class AgentInput(BaseModel):
    input: str
    chat_history: List[Tuple[str, str]] = Field(
        ..., extra={"widget": {"type": "chat", "input": "input", "output": "output"}}
    )

def make_agent_executor(model_name, tool_names):
    llm = ChatOpenAI(model_name=model_name, openai_api_key=os.environ.get("OPENAI_API_KEY"), openai_api_base=os.environ.get("OPENAI_API_BASE_URL"))
    chat_model_with_stop = llm.bind(stop=["\nObservation"])
    
    tools = [TOOLS[tool_name] for tool_name in tool_names]
    
    print("================\n", make_system_prompt(tools), "\n================")
    
    prompt = ChatPromptTemplate.from_messages(
        [   
            ("user", "Here is some data about me: "+get_user_data()),
            MessagesPlaceholder(variable_name="chat_history"),
            SystemMessagePromptTemplate.from_template(make_system_prompt(tools)),
            ("user", "{input}"),
            MessagesPlaceholder(variable_name="agent_scratchpad"),
        ]
    )
    
    agent = (
        {
            "input": lambda x: x["input"],
            "agent_scratchpad": lambda x: format_log_to_messages(x["intermediate_steps"]),
            "chat_history": lambda x: (
                _format_chat_history(x["chat_history"]) if x.get("chat_history") else [("user", "my favourite color is #ff00ff")]
            ),
            "enviroment": lambda x: _format_enviroment(x["enviroment"]),
        }
        | prompt
        | chat_model_with_stop
        | ReActJsonSingleInputOutputParser()
    )
    
    return AgentExecutor(agent=agent, tools=tools, verbose=True, handle_parsing_errors=True).with_types(
        input_type=AgentInput
    )


agent_executor = make_agent_executor(AGENT["llm"], AGENT["tools"].keys())