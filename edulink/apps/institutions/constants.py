# Institution Status
STATUS_REQUESTED = "requested"
STATUS_UNVERIFIED = "unverified"
STATUS_VERIFIED = "verified"
STATUS_ACTIVE = "active"
STATUS_SUSPENDED = "suspended"

STATUS_CHOICES = [
    (STATUS_REQUESTED, "Requested"),
    (STATUS_UNVERIFIED, "Unverified"),
    (STATUS_VERIFIED, "Verified"),
    (STATUS_ACTIVE, "Active"),
    (STATUS_SUSPENDED, "Suspended"),
]

# Trust Levels
TRUST_REGISTERED = 0
TRUST_ACTIVE = 1
TRUST_HIGH = 2
TRUST_PARTNER = 3

TRUST_CHOICES = [
    (TRUST_REGISTERED, "Registered"),
    (TRUST_ACTIVE, "Active"),
    (TRUST_HIGH, "High Trust"),
    (TRUST_PARTNER, "Strategic Partner"),
]
