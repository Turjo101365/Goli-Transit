-- =========================
-- DATABASE
-- =========================
IF DB_ID('__DB_NAME__') IS NULL
BEGIN
    CREATE DATABASE __DB_NAME__;
END
GO

USE __DB_NAME__;
GO

-- =========================
-- USERS
-- =========================
IF OBJECT_ID('dbo.users', 'U') IS NOT NULL
    DROP TABLE dbo.users;
GO

CREATE TABLE dbo.users (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    name NVARCHAR(120) NOT NULL,
    email NVARCHAR(191) NOT NULL,
    password_hash NVARCHAR(255) NOT NULL,
    created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    updated_at DATETIME2 NOT NULL DEFAULT GETDATE()
);
GO

CREATE UNIQUE INDEX uq_users_email ON dbo.users(email);
CREATE INDEX idx_users_created_at ON dbo.users(created_at);
GO

-- =========================
-- PASSWORD RESET TOKENS
-- =========================
IF OBJECT_ID('dbo.password_reset_tokens', 'U') IS NOT NULL
    DROP TABLE dbo.password_reset_tokens;
GO

CREATE TABLE dbo.password_reset_tokens (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    user_id BIGINT NOT NULL,
    token_hash CHAR(64) NOT NULL,
    expires_at DATETIME2 NOT NULL,
    consumed_at DATETIME2 NULL,
    created_at DATETIME2 NOT NULL DEFAULT GETDATE(),

    CONSTRAINT uq_password_reset_tokens_hash UNIQUE (token_hash),
    CONSTRAINT fk_password_reset_tokens_user
        FOREIGN KEY (user_id) REFERENCES dbo.users(id)
        ON DELETE CASCADE
);
GO

CREATE INDEX idx_password_reset_tokens_user_id ON dbo.password_reset_tokens(user_id);
CREATE INDEX idx_password_reset_tokens_expires_at ON dbo.password_reset_tokens(expires_at);
CREATE INDEX idx_password_reset_tokens_consumed_at ON dbo.password_reset_tokens(consumed_at);
GO

-- =========================
-- NODES
-- =========================
IF OBJECT_ID('dbo.nodes', 'U') IS NOT NULL
    DROP TABLE dbo.nodes;
GO

CREATE TABLE dbo.nodes (
    id NVARCHAR(64) PRIMARY KEY,
    metadata NVARCHAR(MAX) NULL,
    created_at DATETIME2 NOT NULL DEFAULT GETDATE()
);
GO

-- =========================
-- EDGES
-- =========================
IF OBJECT_ID('dbo.edges', 'U') IS NOT NULL
    DROP TABLE dbo.edges;
GO

CREATE TABLE dbo.edges (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    from_node_id NVARCHAR(64) NOT NULL,
    to_node_id NVARCHAR(64) NOT NULL,
    mode NVARCHAR(20) NOT NULL,
    base_weight DECIMAL(10,2) NOT NULL,
    current_weight DECIMAL(10,2) NOT NULL,
    allowed_vehicles NVARCHAR(MAX) NULL,
    created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),

    CONSTRAINT uq_edges_from_to_mode UNIQUE (from_node_id, to_node_id, mode),
    CONSTRAINT fk_edges_from_node FOREIGN KEY (from_node_id)
        REFERENCES dbo.nodes(id) ON DELETE CASCADE,
    CONSTRAINT fk_edges_to_node FOREIGN KEY (to_node_id)
        REFERENCES dbo.nodes(id) ON DELETE CASCADE
);
GO

CREATE INDEX idx_edges_from_node ON dbo.edges(from_node_id);
CREATE INDEX idx_edges_to_node ON dbo.edges(to_node_id);
CREATE INDEX idx_edges_mode ON dbo.edges(mode);
GO

-- =========================
-- ANOMALIES
-- =========================
IF OBJECT_ID('dbo.anomalies', 'U') IS NOT NULL
    DROP TABLE dbo.anomalies;
GO

CREATE TABLE dbo.anomalies (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    type NVARCHAR(64) NOT NULL,
    reason NVARCHAR(255) NOT NULL,
    starts_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    expires_at DATETIME2 NULL,
    status NVARCHAR(20) NOT NULL DEFAULT 'active',
    payload NVARCHAR(MAX) NULL,
    created_at DATETIME2 NOT NULL DEFAULT GETDATE()
);
GO

CREATE INDEX idx_anomalies_status ON dbo.anomalies(status);
CREATE INDEX idx_anomalies_expires_at ON dbo.anomalies(expires_at);
CREATE INDEX idx_anomalies_created_at ON dbo.anomalies(created_at);
GO

-- =========================
-- ANOMALY EDGES
-- =========================
IF OBJECT_ID('dbo.anomaly_edges', 'U') IS NOT NULL
    DROP TABLE dbo.anomaly_edges;
GO

CREATE TABLE dbo.anomaly_edges (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    anomaly_id BIGINT NOT NULL,
    from_node_id NVARCHAR(64) NOT NULL,
    to_node_id NVARCHAR(64) NOT NULL,
    mode NVARCHAR(20) NOT NULL,
    multiplier DECIMAL(10,2) NOT NULL,
    updated_weight DECIMAL(10,2) NOT NULL,
    created_at DATETIME2 NOT NULL DEFAULT GETDATE(),

    CONSTRAINT fk_anomaly_edges_anomaly
        FOREIGN KEY (anomaly_id) REFERENCES dbo.anomalies(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_anomaly_edges_edge
        FOREIGN KEY (from_node_id, to_node_id, mode)
        REFERENCES dbo.edges(from_node_id, to_node_id, mode)
        ON DELETE CASCADE
);
GO

CREATE INDEX idx_anomaly_edges_anomaly_id ON dbo.anomaly_edges(anomaly_id);
GO