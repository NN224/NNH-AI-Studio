# Architecture Decision Records (ADR)

## ADR-001: Auto-Reply Without Approval
**Date:** January 20, 2025
**Status:** ✅ Accepted

### Context
User wants instant review replies without manual approval to provide immediate customer service.

### Decision
Set `requireApproval = false` as default in auto_reply_settings.

### Consequences
**Pros:**
- Instant replies (< 1 minute)
- Better customer experience
- Reduced workload for business owners
- Competitive advantage

**Cons:**
- Need monitoring for quality
- Potential for inappropriate responses
- Less human touch

**Mitigation:**
- AI confidence scores for quality control
- Audit trail for all replies
- User can review and edit after sending
- Option to enable approval if needed
- Per-rating control (can disable for 1-star reviews)

---

## ADR-002: Backend-First Development Strategy
**Date:** January 20, 2025
**Status:** ✅ Accepted

### Context
User concerned about forgetting frontend development while focusing on backend.

### Decision
Build features using Backend → Test → Frontend → Test → Deploy cycle.
Never skip frontend. Each feature must be 100% complete before moving to next.

### Consequences
**Pros:**
- APIs tested before UI built
- Less rework
- Working features continuously deployed
- Early user feedback

**Cons:**
- Requires discipline
- Slower initial progress
- Must resist urge to start next feature

**Mitigation:**
- Strict checklist per feature
- Daily progress review
- No starting new feature until current is deployed

---

## ADR-003: Multi-AI Provider Routing
**Date:** January 20, 2025
**Status:** ✅ Accepted

### Context
Different AI models excel at different tasks. Using a single provider is suboptimal.

### Decision
Implement intelligent routing to select best AI model for each task:
- Gemini: Creative content
- Claude: Empathetic responses
- GPT-4: Analysis
- Groq: Real-time speed
- DeepSeek: Code generation

### Consequences
**Pros:**
- Best quality for each task
- Cost optimization
- Speed optimization
- Redundancy (fallback options)

**Cons:**
- More complex routing logic
- Need to manage multiple API keys
- Different rate limits per provider

**Mitigation:**
- Build abstraction layer (AIRouter service)
- Automatic fallback chain
- Usage tracking per provider
- Cost monitoring

---

## ADR-004: Feature-by-Feature Deployment
**Date:** January 20, 2025
**Status:** ✅ Accepted

### Context
User wants complete platform but worried about managing 4-week timeline.

### Decision
Deploy features incrementally:
- Week 1: Auto-Reply (MVP)
- Week 2: Auto-Answer Questions
- Week 3: AI Suggestions
- Week 4: AI Co-Pilot

Each week produces working, deployed feature.

### Consequences
**Pros:**
- Continuous value delivery
- Early user feedback
- Reduced risk
- Motivation boost (seeing progress)

**Cons:**
- More deployment overhead
- Need to maintain backward compatibility
- Testing overhead

**Mitigation:**
- Automated testing
- Feature flags
- Comprehensive documentation

---

## ADR-005: User Approval for Profile Changes
**Date:** January 20, 2025
**Status:** ✅ Accepted

### Context
While auto-replies should be instant, profile changes affect business representation on Google.

### Decision
All GMB profile changes (description, hours, attributes, categories) require user approval.
AI suggests, user decides.

### Consequences
**Pros:**
- User maintains full control
- Trust and transparency
- No surprise changes
- Reduces liability

**Cons:**
- Not fully automatic
- User must review suggestions
- Slower profile optimization

**Mitigation:**
- Make approval process very easy (one-click)
- Show clear before/after preview
- Explain impact of each change
- Prioritize by impact (do high-impact first)

---

## Future ADRs
*New decisions will be added as we progress*

