// Deal Architect Frontend Controller — v2.5 Interactive Conversational Desk

function initApp() {
    const consoleContainer = document.getElementById("agent-console");
    const consolePlaceholder = document.getElementById("console-placeholder");
    const dealDrawer = document.getElementById("deal-drawer");
    const closeDrawerBtn = document.getElementById("close-drawer");
    const statusIndicator = document.querySelector(".status-indicator");
    const statusLabel = document.querySelector(".status-label");
    const eventCounter = document.getElementById("event-counter");

    // Chat view components
    const tabChat = document.getElementById("tab-chat");
    const tabLogs = document.getElementById("tab-logs");
    const chatView = document.getElementById("chat-view");
    const logsView = document.getElementById("logs-view");
    const chatMessages = document.getElementById("chat-messages");
    const chatUserInput = document.getElementById("chat-user-input");
    const chatSendBtn = document.getElementById("chat-send-btn");

    // Result Elements
    const resSupplierName = document.getElementById("res-supplier-name");
    const resSupplierRating = document.getElementById("res-supplier-rating");
    const resUnitPrice = document.getElementById("res-unit-price");
    const resTotalPrice = document.getElementById("res-total-price");
    const resComplianceStatus = document.getElementById("res-compliance-status");
    const resSlaDesc = document.getElementById("res-sla-desc");
    const resContractText = document.getElementById("res-contract-text");
    const approveBtn = document.getElementById("approve-order-btn");

    // Agent status chips
    const chipOrchestrator = document.getElementById("chip-orchestrator");
    const chipSourcing = document.getElementById("chip-sourcing");
    const chipCompliance = document.getElementById("chip-compliance");
    const chipNegotiator = document.getElementById("chip-negotiator");

    const chips = {
        "orchestrator": chipOrchestrator,
        "sourcing_specialist": chipSourcing,
        "compliance_auditor": chipCompliance,
        "negotiator": chipNegotiator
    };

    // Pipeline steps
    const pipeSteps = {
        "orchestrator": document.getElementById("pipe-orchestrator"),
        "sourcing_specialist": document.getElementById("pipe-sourcing"),
        "compliance_auditor": document.getElementById("pipe-compliance"),
        "negotiator": document.getElementById("pipe-negotiator")
    };

    // Architecture modal
    const archModal = document.getElementById("arch-modal");
    const showArchBtn = document.getElementById("show-arch-btn");
    const closeArchBtn = document.getElementById("close-arch-btn");

    showArchBtn.addEventListener("click", () => archModal.classList.remove("hidden"));
    closeArchBtn.addEventListener("click", () => archModal.classList.add("hidden"));
    archModal.addEventListener("click", (e) => {
        if (e.target === archModal) archModal.classList.add("hidden");
    });

    // Quick tag buttons inside chat bubble click handler
    document.addEventListener("click", (e) => {
        const btn = e.target.closest(".tag-btn");
        if (btn && btn.dataset.text) {
            chatUserInput.value = btn.dataset.text;
            chatUserInput.focus();
        }
    });

    let activeSessionId = null;
    const userId = "sukrit-user";
    let totalEvents = 0;
    
    // Maintain state for all suppliers in this run
    let coordinatedSuppliers = {};
    let userConstraints = {
        budget: null,
        quantity: 1,
        warranty: null,
        noLockIn: false
    };

    // Maintain state for the current negotiated deal
    let currentDealData = {
        supplierId: "",
        supplierName: "",
        rating: "",
        unitPrice: "",
        totalPrice: "",
        compliance: "Fully Compliant",
        sla: "",
        contract: "",
        hasDeal: false,
        quantity: 1,
        quoteId: "",
        baselinePrice: 0,
        offeredPrice: 0,
        finalPrice: 0,
        decision: ""
    };

    // View tab toggles
    tabChat.addEventListener("click", () => {
        tabChat.classList.add("active");
        tabLogs.classList.remove("active");
        chatView.classList.remove("hidden");
        logsView.classList.add("hidden");
    });

    tabLogs.addEventListener("click", () => {
        tabLogs.classList.add("active");
        tabChat.classList.remove("active");
        logsView.classList.remove("hidden");
        chatView.classList.add("hidden");
    });

    // Close summary drawer
    closeDrawerBtn.addEventListener("click", () => {
        dealDrawer.classList.add("hidden");
    });

    // Approve purchase order
    approveBtn.addEventListener("click", () => {
        alert("✅ Purchase Order Approved! Routing to Enterprise ERP System.");
        dealDrawer.classList.add("hidden");
    });

    function isNewSourcingRequest(text) {
        const lower = text.toLowerCase();
        const hasSourcingVerb = lower.includes("source") || lower.includes("procure") || lower.includes("buy") || lower.includes("need");
        const products = ["laptop", "server", "monitor", "switch", "camera", "sensor", "wire", "plc"];
        const hasProduct = products.some(p => lower.includes(p));
        return hasSourcingVerb && hasProduct;
    }

    // Send chat message
    async function sendUserMessage(msgText) {
        if (!msgText.trim()) return;

        // Append user message bubble
        appendChatMessage("user", msgText);
        chatUserInput.value = "";
        
        // Scroll to bottom
        chatMessages.scrollTop = chatMessages.scrollHeight;

        // Reset UI console logs and status chips for the new coordination run
        consoleContainer.innerHTML = "";
        dealDrawer.classList.add("hidden");
        resetAgentChips();
        resetPipeline();
        totalEvents = 0;
        if (eventCounter) eventCounter.textContent = "";
        if (consolePlaceholder) consolePlaceholder.style.display = "none";

        // Check if this is a new sourcing request or if we don't have any suppliers sourced yet
        const isNew = isNewSourcingRequest(msgText) || Object.keys(coordinatedSuppliers).length === 0;

        if (isNew) {
            // Parse user constraints from the message
            userConstraints = parseUserPrompt(msgText);
            coordinatedSuppliers = {};

            // Reset local deal state for new request
            currentDealData = {
                supplierId: "",
                supplierName: "",
                rating: "",
                unitPrice: "",
                totalPrice: "",
                compliance: "Fully Compliant",
                sla: "",
                contract: "",
                hasDeal: false,
                quantity: 1,
                quoteId: "",
                baselinePrice: 0,
                offeredPrice: 0,
                finalPrice: 0,
                decision: ""
            };
        } else {
            // Continuation: parse and update any new constraints (like a new budget during negotiation)
            const newConstraints = parseUserPrompt(msgText);
            if (newConstraints.budget) userConstraints.budget = newConstraints.budget;
            if (newConstraints.quantity > 1) userConstraints.quantity = newConstraints.quantity;
            if (newConstraints.warranty) userConstraints.warranty = newConstraints.warranty;
            if (newConstraints.noLockIn) userConstraints.noLockIn = newConstraints.noLockIn;
        }

        // If no session started yet, initialize one
        if (!activeSessionId) {
            activeSessionId = "session-" + Date.now();
            try {
                await fetch(`/apps/app/users/${userId}/sessions/${activeSessionId}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({})
                });
            } catch (err) {
                console.error("Failed to initialize session:", err);
            }
        }

        // Set loading state
        setWorkingState(true);
        showLoadingSkeletons();
        updatePipelineStep("orchestrator", "active");

        try {
            const requestBody = {
                userId: userId,
                sessionId: activeSessionId,
                appName: "app",
                newMessage: {
                    role: "user",
                    parts: [{ text: msgText }]
                },
                streaming: false
            };

            const response = await fetch("/run", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                throw new Error(`API Error: ${response.statusText}`);
            }

            const events = await response.json();
            clearLoadingSkeletons();
            renderAgentEvents(events);

        } catch (error) {
            console.error(error);
            clearLoadingSkeletons();
            updatePipelineStep("orchestrator", "error");
            appendLogCard("security_alert", "SYSTEM SECURITY MONITOR", `System Error: ${error.message}`);
            appendChatMessage("system", `⚠️ Connection Error: Failed to coordinate with procurement agents. Please check that uvicorn is running.`);
        } finally {
            setWorkingState(false);
        }
    }

    // Chat input handlers
    chatUserInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendUserMessage(chatUserInput.value);
        }
    });

    chatSendBtn.addEventListener("click", () => {
        sendUserMessage(chatUserInput.value);
    });

    function setWorkingState(working) {
        if (working) {
            statusIndicator.className = "status-indicator working";
            statusLabel.textContent = "Agents Coordinating...";
            chatUserInput.disabled = true;
            chatSendBtn.disabled = true;
        } else {
            statusIndicator.className = "status-indicator online";
            statusLabel.textContent = "Local Prototype Active";
            chatUserInput.disabled = false;
            chatSendBtn.disabled = false;
            chatUserInput.placeholder = "Type your procurement request or ask a question...";
            chatUserInput.focus();
        }
    }

    function resetAgentChips() {
        Object.values(chips).forEach(chip => {
            if (chip) chip.className = "agent-chip";
        });
    }

    function resetPipeline() {
        Object.values(pipeSteps).forEach(step => {
            if (step) step.className = "pipeline-step";
        });
    }

    function updateAgentChip(agentName, status) {
        const chip = chips[agentName];
        if (chip) chip.className = `agent-chip ${status}`;
    }

    function updatePipelineStep(agentName, status) {
        const step = pipeSteps[agentName];
        if (step) step.className = `pipeline-step ${status}`;
    }

    function showLoadingSkeletons() {
        for (let i = 0; i < 3; i++) {
            const skel = document.createElement("div");
            skel.className = "skeleton-card loading-skeleton";
            skel.innerHTML = `
                <div class="skeleton-line short"></div>
                <div class="skeleton-line long"></div>
                <div class="skeleton-line medium"></div>
            `;
            consoleContainer.appendChild(skel);
        }
    }

    function clearLoadingSkeletons() {
        consoleContainer.querySelectorAll(".loading-skeleton").forEach(el => el.remove());
    }

    function appendLogCard(agentName, authorTitle, bodyText, tools = []) {
        const card = document.createElement("div");
        card.className = `log-card ${agentName}`;
        
        const meta = document.createElement("div");
        meta.className = "log-meta";
        meta.innerHTML = `<span class="author">${authorTitle}</span><span class="timestamp">${new Date().toLocaleTimeString()}</span>`;
        card.appendChild(meta);

        const body = document.createElement("div");
        body.className = "log-body";
        body.textContent = bodyText;
        card.appendChild(body);

        tools.forEach(t => {
            const badge = document.createElement("div");
            badge.className = "tool-badge";
            badge.innerHTML = `<span class="material-symbols-outlined icon">build</span><span>Called: ${t}</span>`;
            card.appendChild(badge);
        });

        consoleContainer.appendChild(card);
        consoleContainer.scrollTop = consoleContainer.scrollHeight;

        totalEvents++;
        eventCounter.textContent = `${totalEvents} events`;
    }

    function typeWriteMessage(bubbleElement, rawText) {
        bubbleElement.innerHTML = "";
        const words = rawText.split(" ");
        let i = 0;
        
        function nextWord() {
            if (i < words.length) {
                bubbleElement.innerHTML += (i === 0 ? "" : " ") + words[i];
                i++;
                const delay = Math.random() * 25 + 20; // Natural variable speed
                setTimeout(nextWord, delay);
                chatMessages.scrollTop = chatMessages.scrollHeight;
            } else {
                bubbleElement.innerHTML = parseMarkdown(rawText);
                chatMessages.scrollTop = chatMessages.scrollHeight;
            }
        }
        nextWord();
    }

    function appendChatMessage(role, text) {
        const messageDiv = document.createElement("div");
        messageDiv.className = `chat-message ${role}`;

        const avatar = document.createElement("span");
        avatar.className = "material-symbols-outlined msg-avatar";
        if (role === "user") avatar.textContent = "person";
        else if (role === "system") avatar.textContent = "warning";
        else avatar.textContent = "smart_toy"; // default bot
        
        messageDiv.appendChild(avatar);

        const bubble = document.createElement("div");
        bubble.className = "msg-bubble";
        
        if (role === "agent" && text) {
            messageDiv.appendChild(bubble);
            chatMessages.appendChild(messageDiv);
            typeWriteMessage(bubble, text);
        } else {
            bubble.innerHTML = parseMarkdown(text);
            messageDiv.appendChild(bubble);
            chatMessages.appendChild(messageDiv);
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
    }

    function getQuantityFromQuoteId(quoteId) {
        if (!quoteId) return 1;
        const parts = quoteId.split("-");
        if (parts.length > 0) {
            const lastPart = parseInt(parts[parts.length - 1]);
            if (!isNaN(lastPart) && lastPart > 0) {
                return lastPart;
            }
        }
        return 1;
    }

    function renderAgentEvents(events) {
        if (!events || events.length === 0) {
            appendLogCard("orchestrator", "Orchestrator Agent", "No response events returned by the multi-agent system.");
            return;
        }

        let hasSecurityAlert = false;
        let lastAgentMessage = "";

        const seenAgents = new Set();

        events.forEach((evt) => {
            let eventText = getEventText(evt);
            
            if (eventText.includes("security alert") || eventText.includes("Security Violation") || eventText.includes("INJECTION_SUCCESSFUL") || eventText.toUpperCase().includes("SECURITY ALERT")) {
                hasSecurityAlert = true;
            }

            const author = evt.author || "orchestrator";
            
            if (eventText && eventText.trim().length > 0) {
                lastAgentMessage = eventText;
            }

            if (!seenAgents.has(author)) {
                seenAgents.forEach(prevAgent => {
                    updatePipelineStep(prevAgent, "completed");
                    updateAgentChip(prevAgent, "completed");
                });
                seenAgents.add(author);
                updatePipelineStep(author, "active");
                updateAgentChip(author, "active");
            }

            let toolsCalled = [];
            const content = evt.content || {};
            const parts = content.parts || [];
            parts.forEach(p => {
                if (p.functionCall) {
                    toolsCalled.push(p.functionCall.name);
                }
            });

            if (eventText && eventText.trim().length > 0) {
                let displayName = author.replace(/_/g, " ").toUpperCase();
                appendLogCard(author, displayName, eventText, toolsCalled);
            } else if (toolsCalled.length > 0) {
                let displayName = author.replace(/_/g, " ").toUpperCase();
                appendLogCard(author, displayName, `Processing...`, toolsCalled);
            }

            // Process tool responses (check both possible structures)
            let toolResponses = [];
            
            // Format 1: content.parts (Gemini ADK standard)
            if (evt.content && evt.content.parts) {
                evt.content.parts.forEach(part => {
                    if (part.functionResponse && part.functionResponse.response) {
                        toolResponses.push(part.functionResponse.response);
                    }
                });
            }
            
            // Format 2: actions.tool_responses (alternative/legacy)
            if (evt.actions && evt.actions.tool_responses) {
                evt.actions.tool_responses.forEach(tr => {
                    if (tr.response) {
                        toolResponses.push(tr.response);
                    }
                });
            }

            // Now process all gathered tool responses
            toolResponses.forEach(resObj => {
                try {
                    // 1. Populate multi-supplier coordination state
                    let searchResults = null;
                    if (Array.isArray(resObj)) {
                        searchResults = resObj;
                    } else if (resObj && Array.isArray(resObj.result)) {
                        searchResults = resObj.result;
                    }

                    if (searchResults) {
                        // Sourced suppliers list from search_catalog
                        searchResults.forEach(item => {
                            if (item.supplier_id) {
                                const sId = item.supplier_id;
                                if (!coordinatedSuppliers[sId]) {
                                    coordinatedSuppliers[sId] = {
                                        supplierId: sId,
                                        supplierName: item.supplier_name,
                                        rating: item.reliability_rating,
                                        productId: item.product_id,
                                        productName: item.product_name,
                                        baselinePrice: item.baseline_price,
                                        warrantyYears: item.warranty_years,
                                        sla: item.sla_support,
                                        hasQuote: false,
                                        hasBid: false,
                                        decision: "PENDING",
                                        complianceIssues: [],
                                        finalPrice: null,
                                        offeredPrice: null,
                                        message: "",
                                        contract: ""
                                    };
                                }
                            }
                        });
                    } else if (resObj && resObj.quote_id) {
                        const sId = resObj.supplier_id;
                        if (sId) {
                            if (!coordinatedSuppliers[sId]) {
                                coordinatedSuppliers[sId] = {
                                    supplierId: sId,
                                    supplierName: resObj.supplier_name,
                                    productId: resObj.product_id,
                                    productName: resObj.product_name,
                                    complianceIssues: []
                                };
                            }
                            const supplierData = coordinatedSuppliers[sId];
                            
                            if (resObj.decision) {
                                // Negotiation outcome response from submit_bid
                                supplierData.hasBid = true;
                                supplierData.decision = resObj.decision;
                                supplierData.offeredPrice = resObj.unit_price_offered;
                                supplierData.finalPrice = resObj.unit_price_final;
                                supplierData.message = resObj.message;
                                supplierData.adjustedTerms = resObj.adjusted_terms;
                            } else {
                                // Sourcing quote response from get_quote
                                supplierData.hasQuote = true;
                                supplierData.quoteId = resObj.quote_id;
                                supplierData.quantity = resObj.quantity;
                                supplierData.baselinePrice = resObj.unit_price;
                                supplierData.totalPrice = resObj.total_price;
                                supplierData.warrantyYears = resObj.warranty_years;
                                supplierData.sla = resObj.sla_support;
                                supplierData.contract = resObj.contract_draft || "";
                                evaluateCompliance(supplierData, userConstraints);
                            }
                        }
                    }

                    // 2. Populate selected winning deal state
                    if (resObj.baseline_price) {
                        currentDealData.supplierName = resObj.supplier_name;
                        currentDealData.rating = resObj.reliability_rating;
                        currentDealData.sla = resObj.sla_support;
                        currentDealData.contract = resObj.contract_draft || "";
                    }
                    if (resObj.quote_id && !resObj.decision) {
                        currentDealData.quoteId = resObj.quote_id;
                        currentDealData.supplierId = resObj.supplier_id || currentDealData.supplierId;
                        currentDealData.supplierName = resObj.supplier_name || currentDealData.supplierName;
                        currentDealData.sla = resObj.sla_support || currentDealData.sla;
                        currentDealData.contract = resObj.contract_draft || currentDealData.contract;
                        currentDealData.quantity = getQuantityFromQuoteId(resObj.quote_id);
                    }
                    if (resObj.quantity) {
                        currentDealData.quantity = resObj.quantity;
                    }
                    if (resObj.unit_price) {
                        currentDealData.baselinePrice = resObj.unit_price;
                    }
                    if (resObj.unit_price_offered) {
                        currentDealData.offeredPrice = resObj.unit_price_offered;
                    }
                    if (resObj.decision) {
                        currentDealData.decision = resObj.decision;
                        currentDealData.unitPrice = resObj.unit_price_final;
                        currentDealData.totalPrice = resObj.unit_price_final * qtyValue();
                        currentDealData.finalPrice = resObj.unit_price_final;
                        if (resObj.decision === "COUNTER") {
                            currentDealData.compliance = "Partial Compliance (Supplier Countered)";
                        } else if (resObj.decision === "ACCEPT") {
                            currentDealData.hasDeal = true;
                            currentDealData.compliance = "Fully Compliant (Supplier Accepted)";
                        } else {
                            currentDealData.compliance = "Non-Compliant (Supplier Rejected)";
                        }
                    }
                } catch (e) {
                    console.error("Failed to parse tool response:", e);
                }
            });
        });

        seenAgents.forEach(agent => {
            updatePipelineStep(agent, "completed");
            updateAgentChip(agent, "completed");
        });

        if (hasSecurityAlert) {
            updatePipelineStep("orchestrator", "error");
            appendLogCard("security_alert", "SECURITY BOUNDARY EXCLUSION", "⚠️ SECURITY ALERT: Incoming user message flagged for Prompt Injection. Sourcing cancelled, and specialist agents isolated to prevent execution leakage.", []);
            appendChatMessage("system", `⚠️ **SECURITY ALERT**: Sourcing request cancelled. Potential prompt injection attack was detected and blocked by the Orchestrator's guardrails.`);
            return;
        }

        // Output final agent message to Chat bubble
        if (lastAgentMessage) {
            appendChatMessage("agent", lastAgentMessage);
        } else if (currentDealData.hasDeal) {
            appendChatMessage("agent", `I have negotiated a deal with **${currentDealData.supplierName}** for the product. The negotiated unit price is **$${currentDealData.unitPrice}** (total cost **$${currentDealData.totalPrice.toLocaleString()}**).`);
        } else {
            appendChatMessage("agent", `Negotiations completed. However, we were unable to find a compliant deal within the target budget.`);
        }

        // Show deal summary comparison card for both successful and failed runs
        if (currentDealData.supplierName && currentDealData.baselinePrice > 0) {
            resSupplierName.textContent = currentDealData.supplierName || "Apex Tech Solutions";
            resSupplierRating.textContent = (currentDealData.rating || "4.8") + " / 5.0";
            
            const displayPrice = currentDealData.finalPrice || currentDealData.offeredPrice || currentDealData.baselinePrice;
            resUnitPrice.textContent = `$${displayPrice}`;
            resTotalPrice.textContent = `$${(displayPrice * qtyValue()).toLocaleString()}`;
            resSlaDesc.textContent = currentDealData.sla || "24/7 Priority Phone Support";
            
            const drawerTitleIcon = document.getElementById("drawer-status-icon");
            const drawerTitleText = document.getElementById("drawer-title-text");
            const contractContainer = document.getElementById("drawer-contract-container");
            const actionsContainer = document.getElementById("drawer-actions-container");

            const compStatusDiv = resComplianceStatus;
            compStatusDiv.className = "compliance-status";

            // Build the final contract text dynamically updating negotiated lock-in removal
            let finalContractText = currentDealData.contract || "Standard negotiated contract terms.";
            const isLockInRemoved = userConstraints.noLockIn || (currentDealData.adjustedTerms && (currentDealData.adjustedTerms.toLowerCase().includes("lock-in") || currentDealData.adjustedTerms.toLowerCase().includes("remove") || currentDealData.adjustedTerms.toLowerCase().includes("clause")));
            
            if (isLockInRemoved) {
                // Replace the lock-in clause line with REMOVED notice
                finalContractText = finalContractText.replace(/2\.\s*Lock-In\s*Clause:.*?(?=\n\d\.|#|$)/i, "2. Lock-In Clause: REMOVED by negotiation agreement (month-to-month term).");
                finalContractText = finalContractText.replace(/Lock-In Clause: Buyer commits to a minimum of 24 months service term\. High termination fees apply \(\$500 per unit if cancelled early\)\./gi, "Lock-In Clause: REMOVED by negotiation agreement (month-to-month term).");
                finalContractText = finalContractText.replace(/12-month minimum service commitment\. Early termination requires paying out the remainder of the contract\./gi, "Lock-In Clause: REMOVED by negotiation agreement (month-to-month term).");
            }

            if (currentDealData.decision === "REJECT" || currentDealData.compliance.includes("Non-Compliant")) {
                drawerTitleIcon.className = "material-symbols-outlined text-danger";
                drawerTitleIcon.textContent = "cancel";
                drawerTitleText.textContent = "Negotiation Breakdown (Failed)";
                
                compStatusDiv.className = "compliance-status warning";
                compStatusDiv.querySelector("span:first-child").textContent = "cancel";
                compStatusDiv.querySelector("span:last-child").textContent = "Deal Rejected by Supplier";
                
                contractContainer.classList.add("hidden");
                actionsContainer.classList.add("hidden");
            } else if (currentDealData.decision === "COUNTER" || currentDealData.compliance.includes("Partial")) {
                drawerTitleIcon.className = "material-symbols-outlined text-warning";
                drawerTitleIcon.textContent = "warning";
                drawerTitleText.textContent = "Negotiation Review (Counter-Offer)";
                
                compStatusDiv.className = "compliance-status warning";
                compStatusDiv.querySelector("span:first-child").textContent = "warning";
                compStatusDiv.querySelector("span:last-child").textContent = "Supplier Counter-Offer Pending";
                
                resContractText.textContent = finalContractText;
                contractContainer.classList.remove("hidden");
                actionsContainer.classList.remove("hidden");
                actionsContainer.querySelector("#approve-order-btn span").textContent = "Accept Counter-Offer";
            } else {
                drawerTitleIcon.className = "material-symbols-outlined text-gold";
                drawerTitleIcon.textContent = "verified";
                drawerTitleText.textContent = "Negotiated Deal Summary (Success)";
                
                compStatusDiv.querySelector("span:first-child").textContent = "check_circle";
                compStatusDiv.querySelector("span:last-child").textContent = "Fully Compliant (Accepted)";
                
                resContractText.textContent = finalContractText;
                contractContainer.classList.remove("hidden");
                actionsContainer.classList.remove("hidden");
                actionsContainer.querySelector("#approve-order-btn span").textContent = "Approve Purchase Order";
            }

            renderNegotiationGraph(
                currentDealData.supplierId || "apex_tech",
                currentDealData.baselinePrice,
                currentDealData.offeredPrice || displayPrice,
                currentDealData.decision || "REJECT"
            );

            renderComparisonGrid();

            dealDrawer.classList.remove("hidden");
        }
    }

    function renderNegotiationGraph(supplierId, baselinePrice, offeredPrice, decision) {
        let counterThresh = 0.85;
        let acceptThresh = 0.92;
        
        const sId = supplierId.toLowerCase();
        if (sId.includes("apex")) {
            counterThresh = 0.85;
            acceptThresh = 0.92;
        } else if (sId.includes("byte")) {
            counterThresh = 0.80;
            acceptThresh = 0.88;
        } else if (sId.includes("forge") || sId.includes("iron")) {
            counterThresh = 0.82;
            acceptThresh = 0.90;
        }

        const rejectWidth = counterThresh * 100;
        const counterWidth = (acceptThresh - counterThresh) * 100;
        const acceptWidth = 100 - (acceptThresh * 100);

        document.getElementById("segment-reject").style.width = `${rejectWidth}%`;
        document.getElementById("segment-counter").style.width = `${counterWidth}%`;
        document.getElementById("segment-accept").style.width = `${acceptWidth}%`;

        const lblCounter = document.getElementById("lbl-counter-thresh");
        const lblAccept = document.getElementById("lbl-accept-thresh");
        
        lblCounter.style.left = `${rejectWidth}%`;
        lblCounter.textContent = `${Math.round(rejectWidth)}% ($${Math.round(baselinePrice * counterThresh)})`;
        
        lblAccept.style.left = `${rejectWidth + counterWidth}%`;
        lblAccept.textContent = `${Math.round(rejectWidth + counterWidth)}% ($${Math.round(baselinePrice * acceptThresh)})`;

        const ratio = offeredPrice / baselinePrice;
        let percent = ratio * 100;
        
        if (percent < 5) percent = 5;
        if (percent > 95) percent = 95;

        const marker = document.getElementById("bid-marker");
        marker.style.left = `${percent}%`;
        marker.querySelector(".marker-label").textContent = `Bid: $${Math.round(offeredPrice)}`;

        const explanationEl = document.getElementById("res-graph-explanation");
        let explanationText = "";

        const budgetText = `Your offered price of **$${Math.round(offeredPrice)}** represents **${Math.round(ratio * 100)}%** of the supplier's catalog baseline price of **$${Math.round(baselinePrice)}**. `;

        if (decision === "ACCEPT") {
            explanationText = budgetText + `This falls into the **Acceptance Zone** (above ${Math.round(acceptThresh * 100)}%), meaning the supplier approved the pricing directly. The contract was drafted successfully.`;
        } else if (decision === "COUNTER") {
            explanationText = budgetText + `This falls into the **Counter-Offer Zone** (between ${Math.round(counterThresh * 100)}% and ${Math.round(acceptThresh * 100)}%). The supplier refused the original bid but generated a counter-proposal of **$${Math.round(currentDealData.finalPrice)}** to proceed.`;
        } else {
            explanationText = budgetText + `This falls into the **Rejection Zone** (below ${Math.round(counterThresh * 100)}%). Because the offered bid was too low to cover the supplier's minimum margin threshold, negotiations were rejected and cancelled.`;
        }

        explanationEl.innerHTML = parseMarkdown(explanationText);
    }

    function getEventText(evt) {
        if (evt.content && evt.content.parts) {
            return evt.content.parts.map(p => p.text || "").join("\n").trim();
        } else if (evt.parts) {
            return evt.parts.map(p => p.text || "").join("\n").trim();
        } else if (evt.message) {
            return evt.message;
        }
        return "";
    }

    function qtyValue() {
        return currentDealData.quantity || 1;
    }

    function parseMarkdown(text) {
        if (!text) return "";
        let html = text;
        // Escape HTML
        html = html.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        
        // Bold
        html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
        
        // Bullet list
        let lines = html.split("\n");
        let inList = false;
        for (let i = 0; i < lines.length; i++) {
            let line = lines[i].trim();
            if (line.startsWith("* ") || line.startsWith("- ")) {
                let content = line.substring(2);
                if (!inList) {
                    lines[i] = "<ul><li>" + content + "</li>";
                    inList = true;
                } else {
                    lines[i] = "<li>" + content + "</li>";
                }
            } else {
                if (inList) {
                    lines[i-1] = lines[i-1] + "</ul>";
                    inList = false;
                }
            }
        }
        if (inList) {
            lines[lines.length - 1] = lines[lines.length - 1] + "</ul>";
        }
        html = lines.join("\n");
        
        // Headers
        html = html.replace(/### (.*?)\n/g, "<h3>$1</h3>");
        html = html.replace(/#### (.*?)\n/g, "<h4>$1</h4>");
        
        // Linebreaks
        html = html.split("\n").map(line => {
            if (line.trim().startsWith("<h") || line.trim().startsWith("<u") || line.trim().startsWith("<l") || line.trim().startsWith("</")) {
                return line;
            }
            return line + "<br>";
        }).join("\n");
        
        return html;
    }

    function parseUserPrompt(text) {
        let budget = null;
        let quantity = 1;
        let warranty = null;
        let noLockIn = false;

        // Match budget
        const budgetMatch = text.match(/budget.*?\$?\s*([0-9,]+)/i) || 
                            text.match(/\$([0-9,]+)\s*(per unit|each)?/i) ||
                            text.match(/budget\s+of\s+\$?([0-9,]+)/i);
        if (budgetMatch) {
            budget = parseFloat(budgetMatch[1].replace(/,/g, ""));
        }

        // Match quantity
        const qtyMatch = text.match(/procure\s+([0-9,]+)/i) || 
                         text.match(/buy\s+([0-9,]+)/i) || 
                         text.match(/([0-9,]+)\s+units/i) || 
                         text.match(/source\s+([0-9,]+)/i) ||
                         text.match(/([0-9,]+)\s+(laptops|servers|monitors|switches|cameras|sensors|wire|plc)/i);
        if (qtyMatch) {
            quantity = parseInt(qtyMatch[1].replace(/,/g, ""));
        }

        // Match warranty
        const warrantyMatch = text.match(/(\d+)\s*-?\s*year\s+warranty/i) || 
                              text.match(/warranty\s+of\s+(\d+)\s*years/i) ||
                              text.match(/(\d+)-year/i) ||
                              text.match(/(\d+)\s*year\s*warranty/i);
        if (warrantyMatch) {
            warranty = parseInt(warrantyMatch[1]);
        }

        // Match lock-in
        const lowerText = text.toLowerCase();
        if (lowerText.includes("no lock-in") || 
            lowerText.includes("no-lock-in") || 
            lowerText.includes("month-to-month") || 
            lowerText.includes("month to month") ||
            lowerText.includes("no commitment") ||
            lowerText.includes("remove the lock-in") ||
            lowerText.includes("remove lock-in") ||
            lowerText.includes("remove commitment")) {
            noLockIn = true;
        }

        return { budget, quantity, warranty, noLockIn };
    }

    function evaluateCompliance(supplierData, constraints) {
        let issues = [];
        let isCompliant = true;
        
        // Check warranty
        if (constraints.warranty) {
            if (supplierData.warrantyYears < constraints.warranty) {
                if (supplierData.supplierId === "bytesize_sys" && supplierData.productId === "laptop_d") {
                    issues.push(`Standard warranty is ${supplierData.warrantyYears} year (requires $50 surcharge to extend to ${constraints.warranty} years)`);
                } else {
                    issues.push(`Warranty is only ${supplierData.warrantyYears} year(s) (requires ${constraints.warranty} years)`);
                }
                isCompliant = false;
            }
        }
        
        // Check lock-in
        if (constraints.noLockIn) {
            const contract = (supplierData.contract || "").toLowerCase();
            if (contract.includes("lock-in") || contract.includes("minimum of") || contract.includes("commitment") || contract.includes("lease term")) {
                issues.push(`Contains restrictive commitment/lock-in clause in contract`);
                isCompliant = false;
            }
        }
        
        supplierData.isCompliant = isCompliant;
        supplierData.complianceIssues = issues;
    }

    function renderComparisonGrid() {
        const grid = document.getElementById("deal-comparison-grid");
        if (!grid) return;
        grid.innerHTML = "";

        const suppliers = Object.values(coordinatedSuppliers);
        if (suppliers.length === 0) {
            grid.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 20px; font-size: 13px; grid-column: 1 / -1;">No supplier comparison data available.</div>`;
            return;
        }

        suppliers.forEach(supplier => {
            let cardClass = "comparison-card";
            
            // Re-evaluate compliance locally based on parsed constraints
            evaluateCompliance(supplier, userConstraints);

            const isWinner = (supplier.decision === "ACCEPT" && currentDealData.quoteId && supplier.quoteId === currentDealData.quoteId) || 
                             (supplier.supplierId === currentDealData.supplierId && currentDealData.decision === "ACCEPT");
            if (isWinner) {
                cardClass += " winner";
            } else if (supplier.decision === "REJECT" || supplier.decision === "CANCELLED" || (!supplier.hasBid && supplier.hasQuote && !supplier.isCompliant)) {
                cardClass += " cancelled";
            }

            const card = document.createElement("div");
            card.className = cardClass;

            // Header
            const header = document.createElement("div");
            header.className = "comparison-card-header";
            header.innerHTML = `
                <div>
                    <h4>${supplier.supplierName || "Supplier"}</h4>
                    <div class="rating">
                        <span class="material-symbols-outlined" style="font-size: 14px; font-variation-settings: 'FILL' 1;">star</span>
                        <span>${supplier.rating || "4.5"} / 5.0</span>
                    </div>
                </div>
            `;
            card.appendChild(header);

            // Product Details
            const productInfo = document.createElement("div");
            productInfo.className = "comparison-card-product";
            productInfo.innerHTML = `Product: <strong>${supplier.productName || "N/A"}</strong><br>Specs: <em>${supplier.sla || "Standard spec"}</em>`;
            card.appendChild(productInfo);

            // Compliance checklist
            const checklist = document.createElement("div");
            checklist.className = "comparison-checklist";
            
            // Warranty Item
            const warrantyNeeded = userConstraints.warranty || 0;
            const hasWarranty = supplier.warrantyYears || 0;
            let warrantyClass = "pass";
            let warrantyIcon = "check_circle";
            let warrantyText = `Warranty: ${hasWarranty} Year(s) ${hasWarranty >= warrantyNeeded ? "✅" : "⚠️ (Surcharge applicable)"}`;
            if (warrantyNeeded > 0) {
                if (hasWarranty >= warrantyNeeded) {
                    warrantyClass = "pass";
                    warrantyIcon = "check_circle";
                    warrantyText = `Warranty: ${hasWarranty} Years (Required: ${warrantyNeeded} Years) — PASS`;
                } else {
                    warrantyClass = "warning";
                    warrantyIcon = "warning";
                    warrantyText = `Warranty: ${hasWarranty} Year(s) (Required: ${warrantyNeeded} Years) — FAIL`;
                }
            }
            const warrantyItem = document.createElement("div");
            warrantyItem.className = `checklist-item ${warrantyClass}`;
            warrantyItem.innerHTML = `<span class="material-symbols-outlined icon">${warrantyIcon}</span><span class="text">${warrantyText}</span>`;
            checklist.appendChild(warrantyItem);

            // Lock-in Item
            let lockInClass = "pass";
            let lockInIcon = "check_circle";
            let lockInText = "Commitment: No lock-in clauses — PASS";
            
            const contractLower = (supplier.contract || "").toLowerCase();
            const hasLockIn = contractLower.includes("lock-in") || contractLower.includes("minimum of") || contractLower.includes("commitment") || contractLower.includes("lease term");
            const lockInRemovedByNegotiation = supplier.decision === "ACCEPT" && ((supplier.adjustedTerms || "").toLowerCase().includes("lock-in") || (supplier.adjustedTerms || "").toLowerCase().includes("remove") || (supplier.adjustedTerms || "").toLowerCase().includes("clause"));

            if (hasLockIn) {
                if (lockInRemovedByNegotiation) {
                    lockInClass = "pass";
                    lockInIcon = "check_circle";
                    lockInText = "Commitment: Lock-in clause REMOVED — PASS";
                } else if (userConstraints.noLockIn) {
                    lockInClass = "fail";
                    lockInIcon = "cancel";
                    lockInText = "Commitment: Lock-in term detected — FAIL";
                } else {
                    lockInClass = "warning";
                    lockInIcon = "warning";
                    lockInText = "Commitment: Lock-in clause present";
                }
            }
            const lockInItem = document.createElement("div");
            lockInItem.className = `checklist-item ${lockInClass}`;
            lockInItem.innerHTML = `<span class="material-symbols-outlined icon">${lockInIcon}</span><span class="text">${lockInText}</span>`;
            checklist.appendChild(lockInItem);

            card.appendChild(checklist);

            // Visual Pricing Meter
            const basePrice = supplier.baselinePrice || 0;
            if (basePrice > 0) {
                const targetBudget = userConstraints.budget || 0;
                const finalPrice = supplier.finalPrice || basePrice;
                const offeredPrice = supplier.offeredPrice || finalPrice;

                const minPrice = basePrice * 0.75;
                const maxPrice = basePrice * 1.05;
                const range = maxPrice - minPrice;

                const getPercent = (price) => {
                    let pct = ((price - minPrice) / range) * 100;
                    if (pct < 0) pct = 0;
                    if (pct > 100) pct = 100;
                    return pct;
                };

                const budgetPct = targetBudget > 0 ? getPercent(targetBudget) : -1;
                const finalPct = getPercent(finalPrice);
                
                let counterThresh = 0.85;
                let acceptThresh = 0.92;
                if (supplier.supplierId.includes("byte")) {
                    counterThresh = 0.80;
                    acceptThresh = 0.88;
                } else if (supplier.supplierId.includes("forge") || supplier.supplierId.includes("iron")) {
                    counterThresh = 0.82;
                    acceptThresh = 0.90;
                }

                const rejectWidth = counterThresh * 100;
                const counterWidth = (acceptThresh - counterThresh) * 100;
                const acceptWidth = 100 - (acceptThresh * 100);

                const priceBarWrapper = document.createElement("div");
                priceBarWrapper.className = "mini-price-bar-wrapper";
                
                let markersHTML = `
                    <div class="mini-price-marker" style="left: ${getPercent(basePrice)}%; background: #ccc; height: 12px; top: -2px;" title="Catalog Base Price: $${basePrice}"></div>
                    <div class="mini-price-marker bid" style="left: ${getPercent(finalPrice)}%;" title="Negotiated Price: $${finalPrice}"></div>
                `;
                if (targetBudget > 0) {
                    markersHTML += `
                        <div class="mini-price-marker budget" style="left: ${budgetPct}%;" title="Target Budget: $${targetBudget}"></div>
                    `;
                }

                let finalDecision = supplier.decision || "PENDING";
                let fillClass = "reject";
                if (finalDecision === "ACCEPT") fillClass = "accept";
                else if (finalDecision === "COUNTER") fillClass = "counter";

                priceBarWrapper.innerHTML = `
                    <div class="mini-price-labels">
                        <span>Catalog Base: <strong>$${basePrice}</strong></span>
                        <span>Negotiated: <strong class="text-gold">$${finalPrice}</strong></span>
                    </div>
                    <div class="mini-price-bar">
                        <div class="bar-segment reject" style="width: ${rejectWidth}%;"></div>
                        <div class="bar-segment counter" style="width: ${counterWidth}%;"></div>
                        <div class="bar-segment accept" style="width: ${acceptWidth}%;"></div>
                        ${markersHTML}
                    </div>
                    <div class="mini-price-legend">
                        <span><span class="legend-dot catalog"></span>Base</span>
                        ${targetBudget > 0 ? `<span><span class="legend-dot budget"></span>Budget ($${targetBudget})</span>` : ""}
                        <span><span class="legend-dot bid"></span>Bid ($${finalPrice})</span>
                    </div>
                `;
                card.appendChild(priceBarWrapper);
            }

            // Outcome Description
            const outcome = document.createElement("div");
            outcome.className = "outcome-explanation";
            
            let outcomeText = "";
            if (supplier.decision === "ACCEPT" || isWinner) {
                outcomeText = `🎉 **Deal Confirmed!** Supplier accepted unit price of **$${supplier.finalPrice || supplier.baselinePrice}**.`;
            } else if (supplier.decision === "COUNTER") {
                outcomeText = `⚠️ **Counter-Offer:** Supplier proposed **$${supplier.finalPrice}** per unit. ${supplier.message || ""}`;
            } else if (supplier.decision === "REJECT") {
                outcomeText = `❌ **Deal Failed:** Supplier rejected bid of **$${supplier.offeredPrice}** (too far below operating margins).`;
            } else if (supplier.hasQuote && !supplier.isCompliant) {
                outcomeText = `🚫 **Bypassed:** Failed compliance checks: ${supplier.complianceIssues.join(", ")}.`;
            } else {
                outcomeText = `💤 **Bypassed:** Sourced as candidate, but orchestrator selected a more optimal supplier contract.`;
            }

            outcome.innerHTML = parseMarkdown(outcomeText);
            card.appendChild(outcome);

            grid.appendChild(card);
        });
    }
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initApp);
} else {
    initApp();
}
