from fastapi import FastAPI, Request
from fastapi.responses import StreamingResponse
from .engine import generate_linked_estimate
import json

app = FastAPI()

@app.post("/api/generate")
async def generate_file(request: Request):
    # Receive project data from the React frontend
    data = await request.json()
    project_items = data.get("items", [])
    
    # Trigger the engine to create the linked Excel file
    excel_file = generate_linked_estimate(project_items)
    
    # Stream the file back to the browser as a download
    return StreamingResponse(
        excel_file,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=Estimate_Project.xlsx"}
    )

@app.get("/api/health")
def health_check():
    return {"status": "online", "engine": "active"}
