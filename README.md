                    ┌────────────────────────────┐
                    │        Frontend Layer       │
                    │  React / Next.js Portals   │
                    └─────────────┬─────────────┘
                                  │
      ┌─────────────┬─────────────┴─────────────┬─────────────┐
      │             │                           │             │
 | Claims Portal |  Adjuster Dashboard |     Fraud Analytics UI  | Admin Console|
 |-------------- | ------------------- | ---------------------   | ------------ |
 | - Submit claim | - Review cases     |       - Risk scores     |   - RBAC     |
 | - Upload docs  | - Approve/reject   |     - Alerts            |  - Audit logs |
 | - Track status | - Notes & workflow |    - Trends             | - Compliance |

                                  │
                                  ▼
                         ┌───────────────┐
                         │ API Gateway    │
                         │ Auth / RBAC    │
                         └──────┬────────┘
                                │
                                ▼
                    ┌────────────────────────┐
                    │ Backend Microservices  │
                    │ - Claims Service      │
                    │ - Policy Service      │
                    │ - Payments Service    │
                    │ - Document Service    │
                    │ - Workflow Engine     │
                    └──────────┬───────────┘
                               │
        ┌──────────────────────┴──────────────────────┐
        │                                             │
┌───────▼────────┐                          ┌─────────▼────────┐
│ ML Serving     │                          │ Data Layer        │
│ - Fraud Model  │                          │ - Postgres        │
│ - Approval ML  │                          │ - MongoDB         │
│ - Cost Estimator│                         │ - S3 (docs/images)│
│ - NLP Extractor│                          │ - Vector DB       │
└───────┬────────┘                          └─────────┬────────┘
        │                                             │
        ▼                                             ▼
┌───────────────┐                           ┌─────────────────┐
│ ML Pipelines  │                           │ Observability    │
│ ETL → Train → │                           │ Prometheus       │
│ Deploy        │                           │ Grafana          │
│ Fraud / NLP   │                           │ Logging / Alerts │
└───────────────┘                           └─────────────────┘


### FrontEnd Project Structure

claims-frontend/
│
├── src/
│   ├── layouts/
│   │    ├── MainLayout.jsx
│   │    ├── AdminLayout.jsx
│   │
│   ├── pages/
│   │    ├── claims/
│   │    │     ├── ClaimsPortal.jsx
│   │    │     ├── ClaimDetails.jsx
│   │    │
│   │    ├── adjuster/
│   │    │     ├── AdjusterDashboard.jsx
│   │    │     ├── CaseQueue.jsx
│   │    │
│   │    ├── fraud/
│   │    │     ├── FraudAnalytics.jsx
│   │    │
│   │    ├── admin/
│   │    │     ├── AdminConsole.jsx
│   │
│   ├── components/
│   │    ├── Sidebar.jsx
│   │    ├── Navbar.jsx
│   │    ├── DataTable.jsx
│   │    ├── Charts.jsx
│   │
│   ├── router/
│   │    ├── AppRouter.jsx
│   │
│   ├── App.jsx
│   └── main.jsx
