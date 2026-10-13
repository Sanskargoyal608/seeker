import json

with open('test_results.json', 'r') as f:
    data = json.load(f)

print("=" * 120)
print("DETAILED PER-PERSONA RESULTS")
print("=" * 120)

for r in data:
    probs = r.get('problems', [])
    status = 'PASS' if not probs else 'FAIL'
    phase = r.get('final_phase', '?')
    complete = r.get('final_is_complete', False)
    routing = r.get('final_routing', 'NONE')
    complaint = r.get('chief_complaint') or 'MISSING'
    urgency = r.get('urgency', '?')
    conditions = r.get('suspected_conditions', [])
    expected_route = r.get('expected_routing', '?')
    
    icon = "[PASS]" if status == 'PASS' else "[FAIL]"
    print(f"\n{icon} #{r['id']:2d} {r['name']}")
    print(f"   Phase: {phase} | Complete: {complete} | Route: {routing} (Expected: {expected_route})")
    print(f"   Complaint: {complaint}")
    print(f"   Urgency: {urgency} | Conditions: {conditions}")
    if probs:
        for p in probs:
            print(f"   >> {p}")

# === WRONG ROUTING ANALYSIS ===
print("\n" + "=" * 120)
print("WRONG ROUTING ANALYSIS")
print("=" * 120)

wrong_routing = [r for r in data if any("WRONG_ROUTING" in p for p in r.get('problems', []))]
for r in wrong_routing:
    print(f"\n  #{r['id']} {r['name']}: Expected {r['expected_routing']}, Got {r['final_routing']}")
    print(f"     Complaint: {r.get('chief_complaint', 'MISSING')}")
    print(f"     Conditions: {r.get('suspected_conditions', [])}")

# === INCOMPLETE ANALYSIS ===
print("\n" + "=" * 120)
print("INCOMPLETE SESSIONS")
print("=" * 120)
incomplete = [r for r in data if not r.get('final_is_complete', False)]
for r in incomplete:
    print(f"  #{r['id']} {r['name']}: Phase={r.get('final_phase','?')}, Problems={r.get('problems',[])}")

# === ROUTING BIAS ===
print("\n" + "=" * 120)
print("ROUTING BIAS CHECK")
print("=" * 120)
therapist_count = sum(1 for r in data if r.get('final_routing') == 'LICENSED_THERAPIST')
peer_count = sum(1 for r in data if r.get('final_routing') == 'PEER_SUPPORT')
none_count = sum(1 for r in data if not r.get('final_routing'))
print(f"  LICENSED_THERAPIST: {therapist_count}/50")
print(f"  PEER_SUPPORT: {peer_count}/50")
print(f"  NONE: {none_count}/50")

# How many SHOULD have been PEER_SUPPORT?
expected_peer = sum(1 for r in data if r.get('expected_routing') == 'PEER_SUPPORT')
actual_peer = sum(1 for r in data if r.get('final_routing') == 'PEER_SUPPORT' and r.get('expected_routing') == 'PEER_SUPPORT')
print(f"\n  Expected PEER_SUPPORT cases: {expected_peer}")
print(f"  Actually routed to PEER_SUPPORT: {actual_peer}")
print(f"  Wrongly escalated to THERAPIST: {expected_peer - actual_peer}")
