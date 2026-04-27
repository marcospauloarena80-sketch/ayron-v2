---
type: community
cohesion: 0.11
members: 26
---

# Alerts Engine Rules

**Cohesion:** 0.11 - loosely connected
**Members:** 26 nodes

## Members
- [[.buildDedupKey()]] - code - /Users/marcospaulosoliveira/.verdent/verdent-projects/Ayron/apps/api/src/alerts/alerts.engine.ts
- [[.checkCheckoutNoCharge()]] - code - /Users/marcospaulosoliveira/.verdent/verdent-projects/Ayron/apps/api/src/alerts/rules/financial.rules.ts
- [[.checkImplantDue()]] - code - /Users/marcospaulosoliveira/.verdent/verdent-projects/Ayron/apps/api/src/alerts/rules/clinical.rules.ts
- [[.checkMissingBioimpedance()]] - code - /Users/marcospaulosoliveira/.verdent/verdent-projects/Ayron/apps/api/src/alerts/rules/clinical.rules.ts
- [[.checkMissingDocument()]] - code - /Users/marcospaulosoliveira/.verdent/verdent-projects/Ayron/apps/api/src/alerts/rules/clinical.rules.ts
- [[.checkNoReturn()]] - code - /Users/marcospaulosoliveira/.verdent/verdent-projects/Ayron/apps/api/src/alerts/rules/clinical.rules.ts
- [[.checkPendingCharge()]] - code - /Users/marcospaulosoliveira/.verdent/verdent-projects/Ayron/apps/api/src/alerts/rules/financial.rules.ts
- [[.constructor()_14]] - code - /Users/marcospaulosoliveira/.verdent/verdent-projects/Ayron/apps/api/src/alerts/alerts.engine.ts
- [[.constructor()_18]] - code - /Users/marcospaulosoliveira/.verdent/verdent-projects/Ayron/apps/api/src/alerts/alerts.scheduler.ts
- [[.constructor()_20]] - code - /Users/marcospaulosoliveira/.verdent/verdent-projects/Ayron/apps/api/src/alerts/rules/clinical.rules.ts
- [[.constructor()_21]] - code - /Users/marcospaulosoliveira/.verdent/verdent-projects/Ayron/apps/api/src/alerts/rules/financial.rules.ts
- [[.runAlertRules()]] - code - /Users/marcospaulosoliveira/.verdent/verdent-projects/Ayron/apps/api/src/alerts/alerts.scheduler.ts
- [[.runEngine()]] - code - /Users/marcospaulosoliveira/.verdent/verdent-projects/Ayron/apps/api/src/alerts/alerts.controller.ts
- [[.runOnEvent()]] - code - /Users/marcospaulosoliveira/.verdent/verdent-projects/Ayron/apps/api/src/alerts/alerts.engine.ts
- [[.runRulesForClinic()]] - code - /Users/marcospaulosoliveira/.verdent/verdent-projects/Ayron/apps/api/src/alerts/alerts.engine.ts
- [[.severityRank()]] - code - /Users/marcospaulosoliveira/.verdent/verdent-projects/Ayron/apps/api/src/alerts/alerts.engine.ts
- [[.upsertAlert()]] - code - /Users/marcospaulosoliveira/.verdent/verdent-projects/Ayron/apps/api/src/alerts/alerts.engine.ts
- [[AlertsEngine]] - code - /Users/marcospaulosoliveira/.verdent/verdent-projects/Ayron/apps/api/src/alerts/alerts.engine.ts
- [[AlertsScheduler]] - code - /Users/marcospaulosoliveira/.verdent/verdent-projects/Ayron/apps/api/src/alerts/alerts.scheduler.ts
- [[ClinicalRules]] - code - /Users/marcospaulosoliveira/.verdent/verdent-projects/Ayron/apps/api/src/alerts/rules/clinical.rules.ts
- [[FinancialRules]] - code - /Users/marcospaulosoliveira/.verdent/verdent-projects/Ayron/apps/api/src/alerts/rules/financial.rules.ts
- [[alerts.engine.ts]] - code - /Users/marcospaulosoliveira/.verdent/verdent-projects/Ayron/apps/api/src/alerts/alerts.engine.ts
- [[alerts.scheduler.ts]] - code - /Users/marcospaulosoliveira/.verdent/verdent-projects/Ayron/apps/api/src/alerts/alerts.scheduler.ts
- [[calculateScore()]] - code - /Users/marcospaulosoliveira/.verdent/verdent-projects/Ayron/apps/api/src/alerts/alerts.engine.ts
- [[clinical.rules.ts]] - code - /Users/marcospaulosoliveira/.verdent/verdent-projects/Ayron/apps/api/src/alerts/rules/clinical.rules.ts
- [[financial.rules.ts]] - code - /Users/marcospaulosoliveira/.verdent/verdent-projects/Ayron/apps/api/src/alerts/rules/financial.rules.ts

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/Alerts_Engine_Rules
SORT file.name ASC
```

## Connections to other communities
- 4 edges to [[_COMMUNITY_Alerts & Waitlist Engine]]
- 1 edge to [[_COMMUNITY_Alerts Controller]]
- 1 edge to [[_COMMUNITY_Crypto & Patients Service]]

## Top bridge nodes
- [[.runRulesForClinic()]] - degree 12, connects to 2 communities
- [[.upsertAlert()]] - degree 8, connects to 1 community
- [[.buildDedupKey()]] - degree 3, connects to 1 community
- [[.runEngine()]] - degree 2, connects to 1 community