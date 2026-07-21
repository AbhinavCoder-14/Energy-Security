energy-security-mvp/
│
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py          # FastAPI application entrypoint
│   │   ├── schemas.py       # Pydantic data contracts (Agent 1, 2, 3 outputs)
│   │   ├── config.py        # Static refinery matrices & domain data
│   │   ├── agent_one.py     # Geopolitical & route risk scoring agent
│   │   ├── agent_two.py     # Deterministic mathematical impact modeler
│   │   └── agent_three.py   # Procurement orchestration & markdown generator
│   │
│   ├── data/
│   │   └── scenarios.json   # Pre-cached scenario payloads for demo safety
│   │
│   ├── requirements.txt
│   └── Dockerfile
│
└── frontend/
    ├── src/
    │   ├── components/      # Risk cards, impact meters, audit modals
    │   └── pages/           # Single-page dashboard layout
    ├── package.json
    └── Tailwind.config.js