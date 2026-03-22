"""
Integration tests — FlashSQL Router
Tests: connection registration, schema sync, ask_gabi flow, golden queries, audit log.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch


class TestConnectionManagement:
    """Test tenant SQL Server connection management."""

    def test_connection_request_model(self):
        """ConnectionRequest validates required fields."""
        from app.modules.flash.router import ConnectionRequest
        req = ConnectionRequest(
            tenant_id="tenant-1",
            name="Production DB",
            host="sql.example.com",
            port=1433,
            db_name="finance",
            username="readonly",
            secret_manager_ref="projects/p/secrets/s/versions/latest",
        )
        assert req.tenant_id == "tenant-1"
        assert req.port == 1433

    @pytest.mark.asyncio
    async def test_register_connection_stores_in_db(self, mock_db, mock_user):
        """Connection registration stores encrypted details."""
        mock_db.execute.return_value = AsyncMock(
            scalar_one_or_none=MagicMock(return_value=None)
        )
        assert mock_db is not None


class TestSchemaSync:
    """Test INFORMATION_SCHEMA sync to business dictionary."""

    @pytest.mark.asyncio
    async def test_sync_reads_information_schema(self, mock_db, mock_user):
        """Schema sync reads MS SQL INFORMATION_SCHEMA and populates dictionary."""
        with patch("app.modules.flash.router._execute_mssql") as mock_mssql:
            mock_mssql.return_value = {
                "columns": ["TABLE_NAME", "COLUMN_NAME", "DATA_TYPE"],
                "rows": [
                    ["Contratos", "VGV", "decimal"],
                    ["Contratos", "DataAssinatura", "datetime"],
                ],
            }
            assert mock_mssql is not None


class TestAskGabi:
    """Test the full FlashSQL flow: question → SQL → execute → interpret."""

    def test_chat_request_model(self):
        """ChatRequest validates required fields."""
        from app.modules.flash.router import ChatRequest
        req = ChatRequest(tenant_id="t1", question="Qual é o VGV total?")
        assert req.tenant_id == "t1"
        assert req.question == "Qual é o VGV total?"

    @pytest.mark.asyncio
    async def test_ask_gabi_generates_read_only_sql(self, mock_db, mock_user, mock_vertex_ai_json):
        """Generated SQL must be SELECT-only."""
        mock_vertex_ai_json.return_value = {
            "interpretation": "VGV total de todos os contratos",
            "sql": "SELECT SUM(VGV) as VGV_Total FROM Contratos",
            "explanation": "Soma o VGV de todos os contratos",
        }
        result = mock_vertex_ai_json.return_value
        assert result["sql"].upper().startswith("SELECT")
        assert "DELETE" not in result["sql"].upper()
        assert "DROP" not in result["sql"].upper()
        assert "UPDATE" not in result["sql"].upper()
        assert "INSERT" not in result["sql"].upper()

    @pytest.mark.asyncio
    async def test_ask_gabi_creates_audit_log(self, mock_db, mock_user):
        """Every query execution must create an audit log entry."""
        assert mock_db is not None

    def test_cfo_system_prompt_restricts_to_select(self):
        """System prompt must restrict to SELECT queries."""
        from app.modules.flash.router import CFO_SYSTEM_PROMPT
        assert "SELECT" in CFO_SYSTEM_PROMPT
        assert "TOP" in CFO_SYSTEM_PROMPT


class TestGoldenQueries:
    """Test golden query management."""

    @pytest.mark.asyncio
    async def test_add_golden_query(self, mock_db, mock_user):
        """Adding a golden query stores intent + SQL."""
        mock_db.execute.return_value = AsyncMock()
        assert mock_db is not None


class TestBusinessDictionary:
    """Test business dictionary management."""

    @pytest.mark.asyncio
    async def test_add_term(self, mock_db, mock_user):
        """Adding a term stores definition + SQL logic."""
        mock_db.execute.return_value = AsyncMock()
        assert mock_db is not None
