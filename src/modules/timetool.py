from typing import Optional, Type

from langchain.callbacks.manager import (
    AsyncCallbackManagerForToolRun,
    CallbackManagerForToolRun,
)
from langchain.pydantic_v1 import BaseModel, Field
from langchain.tools import BaseTool


import datetime
import json

class DateTimeInput(BaseModel):
    time_format: str = Field(description="strftime convention format of time representation")


class DateTimeTool(BaseTool):
    name = "Datetime"
    description = "useful for retrieving current date and time"
    args_schema: Type[BaseModel] = DateTimeInput

    def _run(self, time_format: Optional[str] = "", run_manager: Optional[CallbackManagerForToolRun] = None) -> str:
        """Use the tool."""
        
        # Get the current date and time
        current_datetime = datetime.datetime.now()
        
        time_data = {
            "Custom as requested": current_datetime.strftime(time_format)
        }
        
        return "\n".join([f"{k}: {v}" for k, v in time_data.items()])