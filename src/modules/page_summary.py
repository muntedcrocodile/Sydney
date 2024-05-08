
# from langchain_community.document_loaders import WebBaseLoader
from langchain_community.docstore.document import Document
from langchain_openai import ChatOpenAI
from langchain_core.prompts import PromptTemplate
from langchain.chains import StuffDocumentsChain, LLMChain
from langchain.chains.summarize import load_summarize_chain

# Import things that are needed generically
from langchain.pydantic_v1 import BaseModel, Field
from langchain.tools import tool
from bs4 import BeautifulSoup

import requests
import html2text
import pypdf
import json
import os
import io

with open(os.path.join(os.environ.get("DATA_PATH"), "agent_data.json"), 'r') as f:
    AGENT = json.load(f)
    AGENT = AGENT[AGENT["sydney"]["tools"]["page_summary"]["agent"]]
    
    
    
def is_obj(obj, default):
    if obj == None:
        return default
    return obj
    
# Initialize the LLM with your API key
summary_llm = ChatOpenAI(temperature=0, model_name=AGENT["llm"])

with open(os.path.join(os.environ.get("DATA_PATH"), "prompts", AGENT["prompt"]), 'r') as f:
        prompt_template = f.read()


class PageSummaryInput(BaseModel):
    page: str = Field(description="URL of the page to summarize")
    summary_prompt: str = Field(description="The information you want the summary to extract from the page")


@tool("PageSummaryTool", args_schema=PageSummaryInput, return_direct=False)
def PageSummaryTool(page: str, summary_prompt: str) -> str:
    """useful for getting an AI-generated summary of a webpage"""

    response = requests.get(page)

    soup = BeautifulSoup(response.text, "html.parser")
    metadata = {
        'source': response.url,
        'title': is_obj(soup.title, type('Object', (), {'text': "unkown"})).text,
        'description': is_obj(soup.find("meta", {"name": "description"}), {}).get("content","unkown"),
        'language': is_obj(soup.find("html"), {}).get("lang", "unkown")
    }

    if page.endswith(".pdf"):
        pdf_reader = pypdf.PdfReader(io.BytesIO(response.content))
        md_content = ""
        for page in pdf_reader.pages:
            md_content += page.extract_text()
    else:
        html_content = response.text
        converter = html2text.HTML2Text()
        md_content = converter.handle(html_content)
    
    summary_chain = load_summarize_chain(llm=summary_llm, chain_type="stuff", prompt=PromptTemplate.from_template(prompt_template.replace("$CONTENT", summary_prompt)))
    
    # Run the chain to summarize the text
    summary = summary_chain.run([Document(page_content=md_content, metadata=metadata)])

    return summary
