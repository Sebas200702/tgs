import uuid
from pydantic import BaseModel


class CheckoutError(Exception):
    pass


class CheckoutSessionRequest(BaseModel):
    amount: float
    currency: str
    success_url: str
    cancel_url: str
    metadata: dict


class CheckoutSessionResponse(BaseModel):
    session_id: str
    url: str


class CheckoutStatusResponse(BaseModel):
    status: str
    payment_status: str
    amount_total: int
    currency: str


class WebhookEvent(BaseModel):
    session_id: str
    payment_status: str


class StripeCheckout:
    def __init__(self, api_key: str, webhook_url: str):
        self.api_key = api_key
        self.webhook_url = webhook_url

    async def create_checkout_session(self, req: CheckoutSessionRequest) -> CheckoutSessionResponse:
        session_id = f"cs_test_{uuid.uuid4().hex[:24]}"
        return CheckoutSessionResponse(
            session_id=session_id,
            url=f"https://checkout.stripe.com/pay/{session_id}",
        )

    async def get_checkout_status(self, session_id: str) -> CheckoutStatusResponse:
        raise CheckoutError(
            f"Failed to retrieve session status: No such checkout.session: {session_id}"
        )

    async def handle_webhook(self, body: bytes, signature: str) -> WebhookEvent:
        return WebhookEvent(session_id="", payment_status="unknown")
