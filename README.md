                        ┌──────────────────────────────┐
                        │         Frontend Layer        │
                        │  React dashboards / portals   │
                        └─────────────┬────────────────┘
                                      │
         ┌─────────────┬──────────────┴─────────────┬─────────────┐
         │             │                            │             │
|--------------------|--------------------|-----------------------------|----------------|
| Patient 360 Dashboard | Doctor Portal  |           Risk / Forecast Dashboard  |Admin Console |
| - Patient profile    |   - Appointment scheduling | - Disease trends      |    - Access control|
| - Medical history    |   - Lab results |           - Hospital capacity    |   - Audit logs|
| - Medication alerts  |  - Notes        |         - Resource utilization   |
|---------------------|------------------|------------------------------|----------------|
                                      │
                                      ▼
                             ┌───────────────┐
                             │ API Gateway    │
                             │ Auth / RBAC    │
                             │ Rate-limiting │
                             └──────┬────────┘
                                    │
                                    ▼
                          ┌──────────────────────┐
                          │ Backend Services     │
                          │ - Patient Records    │
                          │ - Appointments       │
                          │ - Billing            │
                          │ - Workflow Engine    │
                          └──────────┬───────────┘
                                     │
                   ┌─────────────────┴─────────────────┐
                   │                                   │
          ┌────────▼────────┐                 ┌────────▼────────┐
          │ ML Serving Layer │                 │ Data Layer      │
          │ - Risk Scoring   │                 │ - Postgres      │
          │ - Forecasting    │                 │ - MongoDB       │
          │ - NLP / Summaries│                │ - S3 Storage    │
          └────────┬─────────┘                 └────────┬────────┘
                   │                                   │
                   ▼                                   ▼
           ┌─────────────┐                     ┌─────────────┐
           │ ML Pipelines │                     │ Monitoring &│
           │ ETL → Train  │                     │ Observability│
           │ → Deploy     │                     │ Prometheus /│
           │ Risk + NLP   │                     │ Grafana /   │
           └─────────────┘                     │ Logging     │
                                               └─────────────┘
