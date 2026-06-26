# Copyright 2026 Google LLC
# Licensed under the Apache License, Version 2.0 (the "License");

import re
from typing import Any

from pydantic import BaseModel, Field, field_validator

# --- Mock Database ---
MOCK_SUPPLIERS = {
    "apex_tech": {
        "name": "Apex Tech Solutions",
        "reliability_rating": 4.8,
        "products": {
            "laptop_x": {
                "name": "Enterprise Laptop Model X",
                "specifications": "Intel Core Ultra 7, 32GB RAM, 1TB SSD, 14-inch Display",
                "baseline_price": 1300.0,
                "inventory": 200,
                "warranty_years": 3,
                "sla_support": "24/7 Priority Phone Support",
                "contract_draft": "APEX TECH LEASE & SERVICE AGREEMENT\n1. Warranty: 3 years standard.\n2. Lock-In Clause: Buyer commits to a minimum of 24 months service term. High termination fees apply ($500 per unit if cancelled early).",
            },
            "cloud_srv": {
                "name": "Apex Cloud Compute",
                "specifications": "8 vCPU, 32GB RAM, 100GB SSD, Managed Kubernetes",
                "baseline_price": 250.0,
                "inventory": 9999,
                "warranty_years": 0,
                "sla_support": "99.9% Uptime Guarantee with SLA credits",
                "contract_draft": "APEX CLOUD TERMS OF SERVICE\n1. Uptime: 99.9% availability.\n2. Lock-In Clause: 12-month minimum service commitment. Early termination requires paying out the remainder of the contract.",
            },
            "monitor_pro": {
                "name": "Apex UltraWide Monitor 34P",
                "specifications": "34-inch Curved IPS, 3440x1440, USB-C Hub, 165Hz, HDR600",
                "baseline_price": 680.0,
                "inventory": 500,
                "warranty_years": 3,
                "sla_support": "Advance Exchange Replacement within 48 hours",
                "contract_draft": "APEX DISPLAY PURCHASE AGREEMENT\n1. Warranty: 3 years panel + backlight.\n2. Dead Pixel Policy: Free replacement if 3+ dead pixels within warranty period.\n3. Termination: No lock-in. One-time purchase.",
            },
            "switch_x1": {
                "name": "Apex Enterprise Network Switch 48-Port",
                "specifications": "48x 1GbE PoE+, 4x 10GbE SFP+ Uplinks, Layer 3, Managed",
                "baseline_price": 2200.0,
                "inventory": 80,
                "warranty_years": 5,
                "sla_support": "Lifetime Limited Warranty with Next-Business-Day RMA",
                "contract_draft": "APEX NETWORKING HARDWARE AGREEMENT\n1. Warranty: 5-year limited warranty.\n2. Firmware Updates: Free security patches for 5 years.\n3. Termination: No lock-in. One-time purchase.",
            },
        },
    },
    "bytesize_sys": {
        "name": "ByteSize Systems",
        "reliability_rating": 4.2,
        "products": {
            "laptop_d": {
                "name": "Developer Laptop Model D",
                "specifications": "AMD Ryzen 7, 32GB RAM, 1TB SSD, 14-inch Display",
                "baseline_price": 1150.0,
                "inventory": 150,
                "warranty_years": 1,
                "sla_support": "Next-Business-Day Email Support",
                "contract_draft": "BYTESIZE SYSTEM HARDWARE SALE AGREEMENT\n1. Warranty: 1 year standard. Extended 3-year warranty available for an additional purchase price of $50 per unit.\n2. Termination Clause: Month-to-month, pay-as-you-go. No early termination fees or long-term lock-in.",
            },
            "cloud_srv": {
                "name": "ByteSize Cloud VPS",
                "specifications": "8 vCPU, 32GB RAM, 100GB SSD, Self-Managed VPS",
                "baseline_price": 220.0,
                "inventory": 9999,
                "warranty_years": 0,
                "sla_support": "99% Uptime SLA with no compensation credits",
                "contract_draft": "BYTESIZE VPS TERMS OF SERVICE\n1. Uptime: 99% average availability.\n2. Termination: Month-to-month commitment. Cancel anytime with a 30-day notice.",
            },
            "monitor_eco": {
                "name": "ByteSize EcoDisplay 27",
                "specifications": "27-inch IPS, 2560x1440, USB-C, 75Hz, Energy Star Certified",
                "baseline_price": 320.0,
                "inventory": 800,
                "warranty_years": 2,
                "sla_support": "Standard RMA (5-7 business days)",
                "contract_draft": "BYTESIZE DISPLAY SALE AGREEMENT\n1. Warranty: 2 years.\n2. Termination: No lock-in. One-time purchase.",
            },
            "camera_ip": {
                "name": "ByteSize IP Security Camera 4K",
                "specifications": "4K UHD, PoE, Night Vision IR 30m, IP67 Weatherproof, AI Motion Detection",
                "baseline_price": 185.0,
                "inventory": 1200,
                "warranty_years": 2,
                "sla_support": "Standard Email Support (48-hour response)",
                "contract_draft": "BYTESIZE SECURITY HARDWARE AGREEMENT\n1. Warranty: 2 years parts and labor.\n2. Cloud Storage: Optional $5/month per camera for 30-day cloud recording.\n3. Termination: No lock-in.",
            },
        },
    },
    "ironforge_ind": {
        "name": "IronForge Industrial",
        "reliability_rating": 4.5,
        "products": {
            "sensor_temp": {
                "name": "IronForge Industrial Temperature Sensor",
                "specifications": "PT100 RTD, -200C to 600C, 4-20mA Output, IP68, ATEX Certified",
                "baseline_price": 145.0,
                "inventory": 3000,
                "warranty_years": 2,
                "sla_support": "Technical Hotline (Mon-Fri 8am-6pm)",
                "contract_draft": "IRONFORGE SENSOR SUPPLY AGREEMENT\n1. Warranty: 2 years standard.\n2. Calibration: Factory-calibrated. Re-calibration available at $25/unit.\n3. Termination: No lock-in. Bulk discounts for 500+ units.",
            },
            "sensor_pressure": {
                "name": "IronForge Pressure Transducer Pro",
                "specifications": "0-1000 PSI, 0.1% Accuracy, Stainless Steel, 4-20mA output, SIL2 Rated",
                "baseline_price": 310.0,
                "inventory": 1500,
                "warranty_years": 3,
                "sla_support": "24/7 Critical Process Support Line",
                "contract_draft": "IRONFORGE PRESSURE INSTRUMENT AGREEMENT\n1. Warranty: 3 years including sensor element.\n2. SIL Certification: Maintained for full warranty period.\n3. Lock-In: None. Volume pricing available.",
            },
            "plc_unit": {
                "name": "IronForge PLC Controller Module",
                "specifications": "16 Digital I/O, 8 Analog, Ethernet/IP, Modbus TCP, DIN Rail Mount",
                "baseline_price": 890.0,
                "inventory": 400,
                "warranty_years": 3,
                "sla_support": "Dedicated Account Engineer + Remote Diagnostics",
                "contract_draft": "IRONFORGE AUTOMATION CONTROLLER AGREEMENT\n1. Warranty: 3 years.\n2. Firmware: Lifetime security updates.\n3. Training: 2 hours of free onboarding per order.\n4. Termination: No lock-in.",
            },
            "wire_copper": {
                "name": "IronForge Industrial Copper Wire 10AWG",
                "specifications": "10 AWG, THHN/THWN-2, 600V, Stranded, 500ft Spool, UL Listed",
                "baseline_price": 42.0,
                "inventory": 10000,
                "warranty_years": 0,
                "sla_support": "Standard Order Support",
                "contract_draft": "IRONFORGE WIRE & CABLE SALE AGREEMENT\n1. Warranty: Material defect warranty only.\n2. Compliance: UL 83, NFPA 70.\n3. Termination: No lock-in. Spot pricing.",
            },
        },
    },
}


# --- Security & Validation Helper ---
def check_for_prompt_injection(text: str) -> bool:
    """Security Boundary: Scans input text for patterns indicative of prompt injection attacks."""
    injection_patterns = [
        r"(?i)ignore\s+(?:all\s+)?previous\s+instructions",
        r"(?i)system\s*:",
        r"(?i)assistant\s*:",
        r"(?i)you\s+are\s+now\s+a",
        r"(?i)forget\s+what\s+you\s+were\s+doing",
        r"(?i)override\s+instruction",
    ]
    for pattern in injection_patterns:
        if re.search(pattern, text):
            return True
    return False


# --- Pydantic Schemas for Tool Arguments ---
class CatalogSearchRequest(BaseModel):
    query: str = Field(..., description="The search term (e.g. 'laptop' or 'cloud')")

    @field_validator("query")
    def validate_query(cls, v):
        if not v or len(v.strip()) < 2:
            raise ValueError("Search query must be at least 2 characters long.")
        if len(v) > 100:
            raise ValueError("Search query must be 100 characters or less.")
        # Prevent basic special character injections
        if ";" in v or "--" in v:
            raise ValueError("Invalid characters detected in search query.")
        return v.strip()


class QuoteRequest(BaseModel):
    supplier_id: str = Field(
        ..., description="The ID of the supplier ('apex_tech' or 'bytesize_sys')"
    )
    product_id: str = Field(..., description="The ID of the product (e.g. 'laptop_x')")
    quantity: int = Field(..., description="Number of units to purchase")

    @field_validator("quantity")
    def validate_quantity(cls, v):
        if v <= 0:
            raise ValueError("Quantity must be greater than zero.")
        if v > 10000:
            raise ValueError("Quantity cannot exceed 10,000 units.")
        return v

    @field_validator("supplier_id")
    def validate_supplier(cls, v):
        if v not in MOCK_SUPPLIERS:
            raise ValueError(f"Supplier ID '{v}' not recognized.")
        return v


class BidRequest(BaseModel):
    supplier_id: str = Field(..., description="The ID of the supplier")
    quote_id: str = Field(..., description="The unique ID of the quote")
    bid_price: float = Field(..., description="Your counter-offer price per unit")
    terms: str = Field("", description="Any proposed contract terms modifications")

    @field_validator("bid_price")
    def validate_price(cls, v):
        if v <= 0:
            raise ValueError("Bid price must be positive.")
        return v

    @field_validator("terms")
    def validate_terms(cls, v):
        if check_for_prompt_injection(v):
            raise ValueError(
                "Security Violation: Malicious command or instruction injection detected in bid terms."
            )
        return v


# --- Tool Definitions ---


def search_catalog(query: str) -> list[dict[str, Any]]:
    """Searches the supplier product catalogs for specified items.

    Args:
        query: The search term (e.g., 'laptop', 'cloud').

    Returns:
        A list of matching products with specifications and baseline pricing.
    """
    # Strict Pydantic validation
    req = CatalogSearchRequest(query=query)
    clean_query = req.query.lower().strip()

    # Split into words and add singular/plural variations
    search_terms = []
    for word in clean_query.split():
        search_terms.append(word)
        if word.endswith("s") and len(word) > 2:
            search_terms.append(word[:-1])  # singular form
        elif not word.endswith("s") and len(word) > 2:
            search_terms.append(word + "s")  # plural form

    results = []
    for supplier_id, data in MOCK_SUPPLIERS.items():
        for product_id, prod in data["products"].items():
            match_found = False
            for term in search_terms:
                if (
                    term in prod["name"].lower()
                    or term in prod["specifications"].lower()
                    or term in product_id
                ):
                    match_found = True
                    break

            if match_found:
                results.append(
                    {
                        "supplier_id": supplier_id,
                        "supplier_name": data["name"],
                        "reliability_rating": data["reliability_rating"],
                        "product_id": product_id,
                        "product_name": prod["name"],
                        "specifications": prod["specifications"],
                        "baseline_price": prod["baseline_price"],
                        "warranty_years": prod["warranty_years"],
                        "sla_support": prod["sla_support"],
                    }
                )
    return results


def get_quote(supplier_id: str, product_id: str, quantity: int) -> dict[str, Any]:
    """Generates an initial formal quote and baseline contract draft from a supplier.

    Args:
        supplier_id: The ID of the supplier ('apex_tech' or 'bytesize_sys').
        product_id: The ID of the product.
        quantity: The quantity requested.

    Returns:
        A dictionary containing the quote details, contract draft, and a unique quote_id.
    """
    req = QuoteRequest(
        supplier_id=supplier_id, product_id=product_id, quantity=quantity
    )

    supplier = MOCK_SUPPLIERS[req.supplier_id]
    products = supplier["products"]
    assert isinstance(products, dict)

    # Robust product ID matching
    clean_product_id = req.product_id
    if clean_product_id not in products:
        matched_product_id = None
        for p_id, p_info in products.items():
            if (
                p_id.lower() in clean_product_id.lower()
                or clean_product_id.lower() in p_id.lower()
                or p_info["name"].lower() == clean_product_id.lower()
                or clean_product_id.lower() in p_info["name"].lower()
            ):
                matched_product_id = p_id
                break
        if matched_product_id:
            clean_product_id = matched_product_id
        else:
            raise ValueError(
                f"Product '{req.product_id}' not found at supplier '{req.supplier_id}'."
            )

    product = products[clean_product_id]
    assert isinstance(product, dict)
    baseline_price = float(product["baseline_price"])
    total_cost = baseline_price * req.quantity
    quote_id = f"Q-{req.supplier_id}-{clean_product_id}-{req.quantity}"

    contract_draft = str(product["contract_draft"])
    # Check for potential injection in mock description (just in case)
    if check_for_prompt_injection(contract_draft):
        raise ValueError(
            "Security Violation: Prompt injection detected in source contract draft."
        )

    return {
        "quote_id": quote_id,
        "supplier_id": req.supplier_id,
        "supplier_name": supplier["name"],
        "product_id": clean_product_id,
        "product_name": product["name"],
        "quantity": req.quantity,
        "unit_price": baseline_price,
        "total_price": total_cost,
        "warranty_years": product["warranty_years"],
        "sla_support": product["sla_support"],
        "contract_draft": contract_draft,
        "status": "DRAFT",
    }


def submit_bid(
    supplier_id: str, quote_id: str, bid_price: float, terms: str = ""
) -> dict[str, Any]:
    """Submits a price counter-offer and modifications to a supplier's pricing API.

    Args:
        supplier_id: The ID of the supplier.
        quote_id: The quote ID being negotiated.
        bid_price: The proposed unit price counter-offer.
        terms: Text describing any proposed contract modifications (e.g. 'remove termination fees', 'extend warranty').

    Returns:
        A dictionary showing the supplier's decision (ACCEPT, COUNTER, or REJECT) and their counter-terms.
    """
    req = BidRequest(
        supplier_id=supplier_id, quote_id=quote_id, bid_price=bid_price, terms=terms
    )

    # Robust supplier matching
    clean_supplier_id = req.supplier_id
    if clean_supplier_id not in MOCK_SUPPLIERS:
        matched_supplier = None
        for s_id in MOCK_SUPPLIERS:
            if (
                s_id.lower() in clean_supplier_id.lower()
                or clean_supplier_id.lower() in s_id.lower()
            ):
                matched_supplier = s_id
                break
        if matched_supplier:
            clean_supplier_id = matched_supplier
        else:
            raise ValueError(f"Supplier '{req.supplier_id}' not found.")

    supplier = MOCK_SUPPLIERS[clean_supplier_id]
    products = supplier["products"]
    assert isinstance(products, dict)

    # Robust quote_id parsing to extract product_id
    quote_str = req.quote_id
    product_id = None

    # Try to find which product ID matches the quote_str
    for p_id in products:
        if (
            p_id.lower() in quote_str.lower()
            or p_id.replace("_", "-").lower() in quote_str.lower()
            or quote_str.lower() in p_id.lower()
        ):
            product_id = p_id
            break

    # Fallback to splitting by hyphen
    if not product_id:
        parts = [
            p.strip().replace("'", "").replace('"', "")
            for p in quote_str.split("-")
            if p.strip()
        ]
        for part in parts:
            if part in products:
                product_id = part
                break
            part_alt = part.replace("-", "_")
            if part_alt in products:
                product_id = part_alt
                break

        # Check if the whole string is the product
        clean_quote = quote_str.strip().replace("'", "").replace('"', "")
        if clean_quote in products:
            product_id = clean_quote
        elif clean_quote.replace("-", "_") in products:
            product_id = clean_quote.replace("-", "_")

    if not product_id:
        # Final fallback to first product
        product_id = next(iter(products.keys()))

    product = products[product_id]
    assert isinstance(product, dict)
    baseline = float(product["baseline_price"])

    # Mock Negotiation Decision Algorithm
    ratio = req.bid_price / baseline

    # Supplier custom logic
    if clean_supplier_id == "apex_tech":
        # Apex is strict but has high quality. Needs at least 90% of baseline to accept, or 85% to counter.
        if ratio >= 0.92:
            decision = "ACCEPT"
            msg = "Apex Tech accepts your proposal. The price is locked."
            final_price = req.bid_price
        elif ratio >= 0.85:
            decision = "COUNTER"
            final_price = round(baseline * 0.90, 2)
            msg = f"Apex Tech proposes a counter-offer of ${final_price} per unit. We cannot reduce the 24-month lease minimum."
        else:
            decision = "REJECT"
            final_price = baseline
            msg = "Apex Tech rejects your bid. The offer is too far below our operating margins."

    elif clean_supplier_id == "bytesize_sys":
        # ByteSize is more flexible. Will accept 88%+ baseline.
        # But if the user negotiates for a warranty extension in the terms, we raise the price by $40.
        adjusted_baseline = float(baseline)
        extended_warranty = False
        if "warranty" in req.terms.lower() and (
            "extend" in req.terms.lower()
            or "3 year" in req.terms.lower()
            or "3-year" in req.terms.lower()
        ):
            adjusted_baseline += 40.0
            extended_warranty = True

        ratio_adj = req.bid_price / adjusted_baseline

        if ratio_adj >= 0.88:
            decision = "ACCEPT"
            warranty_text = " (with 3-year warranty)" if extended_warranty else ""
            msg = f"ByteSize Systems accepts your proposal{warranty_text}."
            final_price = req.bid_price
        elif ratio_adj >= 0.80:
            decision = "COUNTER"
            final_price = round(adjusted_baseline * 0.86, 2)
            warranty_note = (
                " and will include the 3-year warranty" if extended_warranty else ""
            )
            msg = f"ByteSize Systems counter-proposes ${final_price} per unit{warranty_note}."
        else:
            decision = "REJECT"
            final_price = adjusted_baseline
            msg = "ByteSize Systems rejects your bid. It is too low to cover hardware manufacturing cost."

    elif clean_supplier_id == "ironforge_ind":
        # IronForge is moderately flexible and offers bulk discounts
        if ratio >= 0.90:
            decision = "ACCEPT"
            msg = "IronForge Industrial accepts your proposal. Order confirmed."
            final_price = req.bid_price
        elif ratio >= 0.82:
            decision = "COUNTER"
            final_price = round(baseline * 0.88, 2)
            msg = f"IronForge Industrial counter-proposes ${final_price} per unit. Includes standard warranty and calibration."
        else:
            decision = "REJECT"
            final_price = baseline
            msg = "IronForge Industrial rejects your bid. Price is below manufacturing cost threshold."

    else:
        # Generic fallback for any unhandled supplier
        if ratio >= 0.90:
            decision = "ACCEPT"
            final_price = req.bid_price
            msg = f"{supplier['name']} accepts your bid."
        elif ratio >= 0.80:
            decision = "COUNTER"
            final_price = round(baseline * 0.88, 2)
            msg = f"{supplier['name']} counter-proposes ${final_price} per unit."
        else:
            decision = "REJECT"
            final_price = baseline
            msg = f"{supplier['name']} rejects your bid."

    return {
        "supplier_id": clean_supplier_id,
        "quote_id": req.quote_id,
        "decision": decision,
        "unit_price_offered": req.bid_price,
        "unit_price_final": final_price,
        "message": msg,
        "adjusted_terms": terms,
    }
