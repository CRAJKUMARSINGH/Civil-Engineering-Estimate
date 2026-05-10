from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import StreamingResponse
from .engine import generate_linked_estimate
import json
import logging

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

@app.post("/api/generate")
async def generate_file(request: Request):
    try:
        # Receive project data from the React frontend
        # This will be a dictionary of sections: {"Section A": [items], ...}
        data = await request.json()
        
        if not data:
            raise HTTPException(status_code=400, detail="No data provided")

        logger.info(f"Generating estimate for {len(data)} sections")
        
        # Trigger the engine to create the linked Excel file
        excel_file = generate_linked_estimate(data)
        
        # Stream the file back to the browser as a download
        return StreamingResponse(
            excel_file,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={
                "Content-Disposition": "attachment; filename=Engineering_Estimate.xlsx",
                "Access-Control-Expose-Headers": "Content-Disposition"
            }
        )
    except Exception as e:
        logger.error(f"Error generating Excel: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/health")
def health_check():
    return {
        "status": "online", 
        "engine": "Multi-Component Core v2.1",
        "deployment": "Vercel Optimized"
    }
