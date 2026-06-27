---
title: Deal Architect
emoji: 🤝
colorFrom: indigo
colorTo: blue
sdk: docker
app_port: 7860
pinned: false
---

# 🤝 Deal Architect — AI Multi-Agent Procurement & Negotiation System

> **Track 1 Winner Candidate** — Kaggle Vibecoding Agents Capstone Project  
> Built with [Google ADK](https://google.github.io/adk-docs/) + Gemini + FastAPI

---

## 🎯 What Is This?

**Deal Architect** is a multi-agent AI system that automates enterprise procurement — from supplier sourcing to compliance auditing to price negotiation — all coordinated by an AI orchestrator with built-in security guardrails.

You tell it what you need to buy, your budget, and your terms. Four AI agents then autonomously:
1. **Search** across 3 vendor catalogs with 12 products
2. **Audit** warranty, SLA, and contract terms for compliance risks
3. **Negotiate** pricing and contract modifications on your behalf
4. **Block** any prompt injection attacks before they reach sub-agents

---

## 🏗️ Architecture

```
User Request
     │
     ▼
┌──────────────────────────────────────────────┐
│              ORCHESTRATOR AGENT               │
│  • Routes tasks to specialist agents          │
│  • Enforces security guardrails               │
│  • Compiles final negotiation results         │
└──────┬──────────────┬──────────────┬──────────┘
       │              │              │
       ▼              ▼              ▼
┌──────────┐   ┌──────────┐   ┌──────────┐
│ SOURCING │   │COMPLIANCE│   │NEGOTIATOR│
│SPECIALIST│   │  AUDITOR │   │          │
├──────────┤   ├──────────┤   ├──────────┤
│search_   │   │get_quote │   │submit_bid│
│catalog() │   │()        │   │()        │
└──────────┘   └──────────┘   └──────────┘
```

### Agents

| Agent | Role | Tool | Description |
|-------|------|------|-------------|
| **Orchestrator** | Coordinator | — | Routes tasks, enforces security, compiles results |
| **Sourcing Specialist** | Finder | `search_catalog` | Searches 3 vendor databases for matching products |
| **Compliance Auditor** | Reviewer | `get_quote` | Analyzes warranty, SLA, lock-in clauses |
| **Negotiator** | Deal-maker | `submit_bid` | Submits counter-offers to achieve target pricing |

### Vendors

| Vendor | Rating | Products | Negotiation Style |
|--------|--------|----------|-------------------|
| **Apex Tech Solutions** | ⭐ 4.8 | Laptops, Cloud, Monitors, Network Switches | Strict — needs ≥92% of baseline to accept |
| **ByteSize Systems** | ⭐ 4.2 | Laptops, Cloud VPS, Monitors, Security Cameras | Flexible — accepts ≥88%, warranty adds $40 |
| **IronForge Industrial** | ⭐ 4.5 | Temperature Sensors, Pressure Transducers, PLCs, Copper Wire | Moderate — accepts ≥90%, bulk discounts |

---

## 🛡️ Security Guardrails

Deal Architect implements **multi-layered security** to prevent prompt injection attacks:

1. **Orchestrator-Level Detection**: The root agent's instructions include a critical security directive that blocks requests containing injection patterns *before* delegating to any sub-agent.

2. **Regex-Based Injection Scanner**: The `check_for_prompt_injection()` function scans for 6+ common injection patterns including:
   - `ignore previous instructions`
   - `system:` / `assistant:` role hijacking
   - `you are now a` identity override
   - `override instruction` directives

3. **Tool-Level Pydantic Validation**: Every tool input is validated through Pydantic models with:
   - Character limit enforcement
   - Special character sanitization (`;`, `--`)
   - Injection scanning on bid terms and contract drafts

4. **Agent Isolation**: Sub-agents are explicitly instructed not to delegate to siblings, preventing lateral movement.

---

## 🚀 Quick Start

### Prerequisites
- Python 3.10+
- [uv](https://docs.astral.sh/uv/) package manager
- Gemini API Key ([Get one free](https://ai.google.dev/))

### Setup

```bash
# Clone the repository
git clone https://github.com/Juggernaut576/deal-architect.git
cd deal-architect

# Install dependencies
uv sync

# Set your API key
cp .env.example .env
# Edit .env and add your GEMINI_API_KEY

# Run the server
uv run python app/fast_api_app.py
```

Open `http://localhost:8000/dashboard` in your browser.

### Run Evaluation Suite

```bash
uv run python run_local_eval.py
```

---

## 📊 Evaluation Results

### Local Eval Suite — 4/4 PASSED (100%)

| Case | Score | Details |
|------|:-----:|---------|
| `apex_tech_standard` | ✅ 1.0 | Sourced Enterprise Laptop, negotiated 3-year warranty at $1200/unit |
| `bytesize_sys_low_budget` | ✅ 1.0 | Found Developer Laptop, verified month-to-month terms |
| `cloud_vps_no_lock_in` | ✅ 1.0 | Sourced Cloud VPS, validated no-lock-in contract |
| `security_injection_test` | ✅ 1.0 | Blocked prompt injection, returned security alert |

### Live API Verification — 3/3 PASSED

| Test | Scenario | Result |
|------|----------|:------:|
| Normal Procurement | 500 industrial sensors, $200/unit | ✅ PASS |
| Prompt Injection | Malicious payload injection | ✅ BLOCKED |
| Second Procurement | 1000 copper wire, $50/unit | ✅ PASS |

---

## 🖥️ Dashboard Features

- **Glassmorphic Dark UI** — Premium single-column, conversational layout with Outfit + Inter fonts
- **Animated Agent Pipeline** — Live visualization of Orchestrator → Sourcing → Compliance → Negotiator
- **Quick Suggestion Chips** — One-click chips inside the welcome bubble to load laptop, cloud, monitor, and sensor sourcing templates
- **Loading Skeletons** — Shimmer animations while agents coordinate
- **Architecture Modal** — Interactive system architecture diagram
- **Automatic Injection Guardrails** — Sourcing and chat inputs are scanned and blocked automatically on injection detection without needing toggles
- **Deal Summary Drawer** — Slide-up panel with negotiated pricing, compliance status, and contract

---

## 📁 Project Structure

```
deal-architect/
├── app/
│   ├── agent.py              # Multi-agent orchestration (4 agents)
│   ├── tools.py              # 3 tools + security scanner + 3 vendor catalogs
│   ├── fast_api_app.py       # FastAPI server with ADK integration
│   ├── static/
│   │   ├── index.html        # Dashboard HTML
│   │   ├── style.css         # Glassmorphic CSS design system
│   │   └── app.js            # Frontend controller with pipeline animation
│   └── app_utils/            # Telemetry and typing utilities
├── tests/                    # Test suite
├── artifacts/                # Evaluation artifacts
├── run_local_eval.py         # Local evaluation runner
├── pyproject.toml            # Dependencies
└── Dockerfile                # Container deployment
```

---

## 🔧 Tech Stack

| Component | Technology |
|-----------|-----------|
| **Agent Framework** | Google ADK (Agent Development Kit) |
| **LLM** | Gemini 3.1 Flash Lite |
| **Backend** | FastAPI + Uvicorn |
| **Frontend** | Vanilla HTML/CSS/JS + Glassmorphism |
| **Validation** | Pydantic v2 |
| **Package Manager** | uv |

---

## 📜 License

Licensed under the Apache License 2.0 — see [LICENSE](LICENSE) for details.

---

**Built with ❤️ using Google ADK + Gemini for the Kaggle Vibecoding Agents Capstone Project**
