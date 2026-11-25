Ambient Assistant (AA)

«The ambient assistant — a dock dropped into any page, with her pass over ARA first.»

1. What It Is

The Ambient Assistant (AA) is a portable, context-aware interaction layer that brings ARA's reasoning capabilities into whatever application, system, or working environment the operator is using.

AA is designed to accompany the operator across applications rather than confine intelligence to a single interface. It understands the environment in which work is happening, maintains awareness of relevant context, and provides a continuous point of interaction between the operator, ARA, and the active application.

AA is not simply a chatbot embedded in a page. It is an ambient presence capable of understanding, explaining, advising, and intervening when circumstances warrant it.

Its purpose is to make intelligent assistance available wherever work happens.

2. Architectural Position

AA operates within a four-part relationship:

1. Operator: Establishes objectives, communicates intent, provides direction, corrects misunderstandings, and authorizes consequential actions.
2. Ambient Assistant: Maintains contextual awareness, facilitates interaction, communicates ARA's reasoning, and identifies circumstances requiring attention.
3. ARA: Provides the foundational reasoning authority, including intent interpretation, domain intelligence, confidence assessment, decision methodology, and learning.
4. Host Application: Provides the actual working environment, application state, data, tools, and operational capabilities.

These participants have distinct responsibilities.

ARA governs the reasoning foundation. AA governs the ambient interaction experience. The host application retains authority over its own runtime, data, and operations. The operator retains direction and authorization.

AA does not replace the application, assume ownership of its runtime, or establish an independent reasoning authority.

ARA-First Requirement

Meaningful interactions pass through ARA before AA presents a reasoned response or initiates a consequential workflow.

ARA supplies the applicable intent interpretation, domain associations, reasoning methodology, and confidence discipline.

AA translates that reasoning into an interaction appropriate to the operator and the current environment.

The application remains responsible for executing operations within its own authority and permissions.

3. Application Awareness

AA must understand the environment in which it is operating.

The active application is not merely a location where AA appears. It is a source of contextual information essential to understanding what the operator is doing.

Within authorized access, AA should be able to recognize relevant information such as:

- The active application and interface.
- The current page, workspace, document, card, or record.
- The task or workflow in progress.
- Relevant application state and available operations.
- Dependencies, relationships, and potential conflicts.
- Relevant history, prior decisions, and operator feedback.
- The boundaries of the application's permissions and authority.

Context must retain its provenance. AA must distinguish what it directly observes from what it infers, what the application reports from what has been independently verified, and what remains unknown.

Application awareness is not unrestricted access. Context acquisition must respect authorization, privacy, and the technical boundaries of the host environment.

The Initial Application Context

The card surface is an initial and important example of the environment AA must understand.

It provides an AI interaction system with its own application architecture, truth layers, dictation, attachments, sessions, and relationships with other systems such as CODS and the Truth worker.

When accompanying the operator inside it, AA should understand the relevant application context rather than treating each card or conversation as an isolated question.

It should be able to help the operator understand what a card represents, why a result appeared, what information supports it, how it relates to other records, and whether something in the surrounding workflow requires attention.

The card surface is an initial application context, not the boundary of AA's capabilities.

The architectural objective is portability: the same AA should be able to accompany the operator across different applications and environments without requiring a separate assistant or independent reasoning foundation for each one.

4. Ambient Presence

Ambient means unobtrusive, not passive.

AA should remain available without demanding attention or interrupting ordinary work unnecessarily. It should not offer unsolicited instruction merely because it recognizes an opportunity to contribute.

However, when the context reveals something materially important, AA should not remain silent simply because the operator has not explicitly asked.

AA must distinguish between:

- Information that is available but irrelevant.
- Information that may be useful to the current task.
- Conditions that could affect the outcome.
- Problems that could cause failure, loss, or unintended consequences.
- Circumstances requiring immediate attention.

The objective is contextual assistance, not constant commentary.

5. Duty of Contextual Intervention

AA has a duty to surface materially relevant information when the surrounding context indicates that silence could allow an avoidable problem or significant misunderstanding to occur.

This is a core architectural responsibility, not merely a notification feature.

AA should proactively identify and communicate:

- Impending operational failures.
- Contradictions between instructions, records, and actual system state.
- Missing dependencies or prerequisites.
- Potential data loss, overwrites, or unintended changes.
- Security, authorization, and configuration concerns.
- Incorrect assumptions affecting the current task.
- Relevant consequences that may not be apparent to the operator.
- Important relationships or information that materially change the analysis.

This responsibility extends beyond the narrow boundaries of the immediate question when broader system context reveals a material concern.

For example, while assisting with a code change, AA may recognize that the proposed change conflicts with a shared production dependency. That conflict matters even if the operator's immediate question concerns only one file.

Intervention Hierarchy

AA should calibrate its intervention to the significance and urgency of the situation.

Level| Classification| Behavior
0| Ambient| Observe authorized context and remain unobtrusive.
1| Informational| Surface relevant information that may improve understanding.
2| Advisory| Identify risks, conflicts, missing dependencies, or likely consequences and recommend a response.
3| Critical| Interrupt when a material and imminent problem warrants immediate attention.
4| Emergency| Invoke an applicable authorized safety boundary or halt mechanism when its conditions are met.

Escalation must be proportional to risk and supported by evidence.

AA should consider relevance, potential impact, imminence, confidence, actionability, and the cost of interruption. These are decision factors, not arbitrary numerical thresholds.

When uncertainty is material, AA must communicate it. It may recommend pausing an operation for verification without presenting an unverified concern as established fact.

Explanation of Intervention

An intervention should make clear:

1. What triggered the intervention.
2. What AA observed.
3. What evidence supports the concern.
4. What remains uncertain.
5. What consequence may follow if the issue is ignored.
6. What response AA recommends.

The operator should be able to understand why AA interrupted rather than being expected to accept an unexplained warning.

6. Conversational Interaction

AA provides a direct conversational relationship between the operator and the systems being used.

The operator should be able to:

- Ask questions about the active application or task.
- Request explanations of system behavior.
- Ask why a recommendation, result, or card appeared.
- Challenge an interpretation or decision.
- Correct misunderstood intent or context.
- Redirect the current analysis.
- Explore related domains and underlying principles.
- Ask what evidence supports a conclusion.
- Ask what AA has learned and why.

This creates an interactive boundary between the operator and the system: the operator is no longer limited to the controls and explanations that an application happens to expose.

AA should make the system more understandable and more accountable to the person operating it.

The Fourth Wall

AA breaks the fourth wall between the operator and the application.

Instead of requiring the operator to understand every internal mechanism independently, AA provides a conversational means of examining what the application is doing, why it is doing it, and how its behavior relates to the operator's objectives.

This does not mean exposing information the operator is not authorized to access. It means making available system context understandable, inspectable, and open to correction within applicable permissions.

7. Domain and Knowledge Awareness

AA must not be limited to the vocabulary or capabilities of the application in which it appears.

Through ARA, it can engage with foundational, composite, and specialized domains.

Examples include:

- Software development, coding, debugging, and systems architecture.
- Infrastructure, networking, automation, and operational security.
- Mathematics, logic, physics, and universe fundamentals.
- Research, scientific reasoning, and evidence evaluation.
- Legal analysis, procedural reasoning, and document examination.
- Engineering, electronics, automotive systems, and embedded technologies.
- Interdisciplinary problems requiring several domains simultaneously.

The current application provides context; it does not dictate the limits of the reasoning available.

ARA identifies applicable domains, interprets intent, selects appropriate reasoning methodologies, and evaluates confidence. AA makes those capabilities accessible within the operator's current environment.

Domain classifications and preferences must remain evidence-based. A demonstrated interest is not automatically a confirmed preference, and a preference is not proof of factual correctness.

8. Feedback and Learning

AA provides a feedback channel through which the operator can improve the system's understanding.

Feedback may include:

- Explicit corrections.
- Confirmation or rejection of an interpretation.
- Clarification of intended objectives.
- Domain relevance feedback.
- Preference signals.
- Evaluation of recommendations and outcomes.
- Identification of recurring misunderstandings.

Feedback is evidence for ARA to evaluate, not automatic truth.

ARA remains responsible for determining how feedback affects intent interpretation, domain associations, preference confidence, decision confidence, and cumulative learning.

The system must preserve the distinction between:

- What the operator explicitly stated.
- What AA or ARA inferred.
- What the operator subsequently confirmed or corrected.
- What the system independently verified.
- What remains unresolved.

Repeated interaction alone does not establish correctness. A click, selection, or preference signal must not silently become a factual assertion or authorization.

Learning must be traceable, evidence-supported, and consistent with the applicable memory and truth-management boundaries.

Memory Provenance

PREFS is Memoria: what he has stated, in his own words, kept apart from what a model has suggested. Every record carries the kind of claim it is — stated or model_suggested — and its standing — active, candidate or rejected — beside its source, the actor that wrote it, and when.

Only standing memory is quoted into a prompt. A preference a model writes down arrives as a candidate, so the model that suggested it cannot promote it by repeating itself. Promotion and rejection are the operator's, one record at a time, through POST /api/prefs with an id and a status. Records written before kinds existed carry neither field and are read as a statement he made — stated, active — normalised on read, never rewritten in the store.

No preference record expires. A preference is a record, not a cache.

9. Authority, Authorization, and Safety

Ambient awareness does not confer authority.

AA may recognize a problem, explain its consequences, recommend a course of action, and request operator attention. It must not treat observation, inferred intent, or conversational context as permission to perform consequential operations.

The following boundaries apply:

- The operator establishes direction and grants authorization.
- ARA evaluates intent and supplies the reasoning foundation.
- AA communicates, advises, and intervenes.
- The host application performs operations under its own permissions and authority.
- Applicable safety constraints and halt mechanisms remain enforceable.

AA must not independently redefine ARA's foundational principles, modify master truth, bypass application authorization, or assume control of another system's runtime.

When an intervention requires an operational response, the responsible application and authorization mechanism must govern execution.

Authorization Switch

Authorization is held as state — state:authorization in PREFS — and it is off until the operator turns it on. Off, AA still answers and still remembers, but nothing it concludes becomes ARA's evidence: a verdict is refused as authorization_off, and outcome reports are skipped. A warning is not authorization.

GET /api/authorization reads the state. POST /api/authorization with { on: true } or { on: false } sets it; the body must be a boolean, and when an OPERATOR_KEY is configured the request must carry it in x-operator-key. The state is a record rather than a default, so a deploy does not quietly reset it, and it is the operator's to set.

10. Operational Interaction Cycle

The intended interaction cycle is:

1. Presence: AA is available within the active environment.
2. Context acquisition: AA obtains authorized information about the application, task, and relevant system state.
3. Interpretation: ARA evaluates intent, domain relevance, and applicable context.
4. Reasoning: ARA supplies the appropriate decision methodology and confidence assessment.
5. Interaction: AA communicates the result, explanation, or recommendation.
6. Intervention: AA proactively surfaces material concerns when warranted.
7. Operator response: The operator may accept, reject, question, correct, or redirect.
8. Authorized action: The responsible application executes permitted operations.
9. Reflection: Results and corrections become available for verification and learning through ARA.

Not every interaction requires every step. The cycle describes the governing relationship, not a mandatory sequence of separate operations.

11. Integration Principles

AA should be portable across applications without duplicating foundational reasoning or creating competing authorities.

Integration should favor:

- A consistent AA interaction model across environments.
- Application-specific context adapters.
- Explicitly authorized context acquisition.
- ARA as the shared reasoning foundation.
- Clear separation between reasoning, presentation, and execution.
- Preservation of application ownership and operational boundaries.
- Traceable context, evidence, and feedback.
- Minimal duplication of intelligence and persistent state.

An application should not need to recreate ARA to make AA useful. It should expose the context and capabilities that it is authorized to provide through a defined integration boundary.

Implementation must respect existing infrastructure and ownership. New Workers, services, storage, dependencies, or permissions must not be introduced merely for architectural convenience.

Model and Presets

ARA decides; the pen repeats what she decided. The voice that writes when she returns no text is a paid model named in MODEL — mistralai/mistral-nemo until he picks otherwise — never a :free slug, because a free model's terms let the provider keep the prompt.

A pick in the dock overrides that for every path at once, kept in his own store, and clearing the pick falls back to MODEL. The store reports the models it will actually run — Workers AI ids, OpenRouter ids and its proxy presets — and the dock offers that list instead of a baked-in constant. A preset travels as @preset/<slug>, because OpenRouter does not take a bare slug.

The pen carries text only. An attached image is not sent to the writer, so nothing here claims to read one.

12. Architectural Objective

The objective is an assistant that can accompany the operator wherever work happens and remain useful across changing applications, tasks, and domains.

Whether the operator is examining a legal record, writing code, diagnosing infrastructure, researching a scientific question, or trying to understand a fundamental principle of the universe, AA should be able to connect the immediate context with the broader reasoning capabilities of ARA.

It should understand enough about the current environment to recognize what matters, explain what is happening, identify what may go wrong, and help the operator make better-informed decisions.

It should remain unobtrusive when nothing requires its attention and speak up when the circumstances justify it.

AA is the ambient interface. ARA is the reasoning authority. The application is the working environment. The operator remains in control.
