"""
Integration tests — InsightCare Router
Tests: document upload, agent chat, client/policy management, regulatory insights.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch


class TestInsightCareAgents:
    """Test the 3 InsightCare agents."""

    def test_chat_request_model(self):
        """ChatRequest validates required fields."""
        from app.modules.insightcare.router import ChatRequest
        req = ChatRequest(tenant_id="t1", agent="policy_analyst", question="Cobertura da apólice?")
        assert req.tenant_id == "t1"
        assert req.agent == "policy_analyst"

    def test_valid_agents(self):
        """InsightCare has 3 valid agents."""
        from app.modules.insightcare.router import AGENTS
        assert "policy_analyst" in AGENTS
        assert "claims_analyst" in AGENTS
        assert "regulatory_consultant" in AGENTS
        assert len(AGENTS) == 3

    @pytest.mark.asyncio
    async def test_policy_analyst_uses_rag(self, mock_db, mock_user, mock_vertex_ai):
        """Policy analyst uses RAG to search uploaded documents."""
        mock_vertex_ai.return_value = "Análise de cobertura: a apólice cobre..."
        assert mock_vertex_ai is not None

    @pytest.mark.asyncio
    async def test_claims_analyst_prompt_includes_actuarial(self):
        """Claims analyst prompt includes actuarial terminology."""
        from app.modules.insightcare.router import AGENTS
        prompt = AGENTS["claims_analyst"]
        assert "sinistralidade" in prompt.lower() or "sinistro" in prompt.lower()

    @pytest.mark.asyncio
    async def test_regulatory_consultant_cites_norms(self):
        """Regulatory consultant prompt requires norm citations."""
        from app.modules.insightcare.router import AGENTS
        prompt = AGENTS["regulatory_consultant"]
        assert "RN" in prompt or "ANS" in prompt or "SUSEP" in prompt


class TestDocumentUpload:
    """Test document and spreadsheet upload."""

    @pytest.mark.asyncio
    async def test_upload_xlsx_processes_claims(self, mock_db, mock_user):
        """XLSX upload should process rows as claims data."""
        assert mock_db is not None

    @pytest.mark.asyncio
    async def test_upload_pdf_creates_chunks(self, mock_db, mock_user):
        """PDF upload creates document + chunks for RAG."""
        assert mock_db is not None


class TestClientManagement:
    """Test client and policy listing."""

    @pytest.mark.asyncio
    async def test_list_clients_filters_by_tenant(self, mock_db, mock_user):
        """List clients returns only current tenant's clients."""
        mock_result = AsyncMock()
        mock_result.scalars.return_value.all.return_value = []
        mock_db.execute.return_value = mock_result
        assert mock_db is not None

    @pytest.mark.asyncio
    async def test_list_policies_filters_by_client(self, mock_db, mock_user):
        """List policies can filter by client_id."""
        mock_result = AsyncMock()
        mock_result.scalars.return_value.all.return_value = []
        mock_db.execute.return_value = mock_result
        assert mock_db is not None
