# ai-agent-travel-planner

AI-Powered Travel Planner (India-First)

A Local-First, Real-Time, Multi-Agent Travel Intelligence System



📌 Overview

This project is an AI-powered travel planning ecosystem designed to help users:

-> Get real-time flight, train, and hotel prices from Indian travel websites

-> Plan trips within a user-defined budget

-> Maintain a travel to-do list & schedule

-> Generate emails and calendar drafts

-> Be guided by local AI agents (Ollama) instead of cloud APIs

-> The app never handles payments or bookings — it redirects users to official booking sites only.



🧠 Core Idea

This is not a chatbot.
This is a travel intelligence system where:

-> Scrapers fetch live data

-> AI agents analyze and reason

-> Backend controls truth

-> UI displays and confirms

-> Everything is auditable and user-controlled.



🏗️ System Architecture

    React Frontend (WebStorm)

            ↓
            
    FastAPI Backend (Python)

            ↓
            
    +-----------------------------------+

    |  Scraping Engine (Playwright)      | → Travel Websites

    |  AI Orchestrator (Ollama Agents)   |

    |  App Database (Trips, Tasks, etc.) |

    +-----------------------------------+

            ↓
            
    React Frontend



🛠️ Technology Stack

Layer	                  Technology

Frontend	              React

Backend           	    FastAPI (Python)

AI	                    Ollama (Local LLMs)

Web Scraping	          Playwright

Voice (Later)	          STT + TTS

Calendar & Email	      Google APIs (Future Phase)

Database	              SQLite / PostgreSQL



🤖 Multi-Agent AI Design

The system uses multiple local AI agents, each with a specific role:

Agent:	                Responsibility:

Planner Agent	          Builds itineraries from scraped data

Budget Agent	          Checks feasibility & suggests alternatives

Task Agent	            Manages to-do lists

Communication Agent	    Drafts emails & calendar entries

Agents never access the web.
They only reason over structured data provided by the backend.



🔍 Real-Time Data Policy

This project does not use estimates or cached data.

All prices come from:

-> Live websites

-> Headless browser automation

-> Real-time queries

-> No APIs. No fake numbers. No hallucinations.



🔐 Why Local AI (Ollama)

-> No monthly API costs

-> Works offline

-> Private by design

-> No cloud server needed

-> Anyone running this project runs their own AI locally.



🚦 User Control & Safety

-> AI never books anything

-> AI never sends emails without confirmation

-> AI never modifies data directly

-> Everything goes through the backend and UI for approval


This ensures:

-> Transparency

-> Safety

-> Trust



📅 Development Roadmap

Phase 1 – Architecture & Design (Completed)

-> Technology selection

-> Data flow design

-> Scraping model

-> Multi-agent AI design

-> System boundaries

Phase 2 – Core System

-> FastAPI backend

-> Playwright scrapers

-> Ollama integration

-> Basic React UI

Phase 3 – Intelligence Layer

-> Budget analysis

-> Task management

-> Email & calendar drafts

-> Voice interface



🎯 Project Goal

To build a portfolio-grade AI system that shows:

-> Real-world web automation

-> AI orchestration

-> Full-stack engineering

-> Product-level thinking
