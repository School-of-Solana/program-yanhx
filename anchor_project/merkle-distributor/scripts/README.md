# Deployment Scripts

这些脚本用于将 Merkle Distributor 程序部署到 devnet 并准备测试 token。

## 前置要求

1. **安装依赖**:
   ```bash
   yarn install
   ```

2. **配置 Solana CLI**:
   ```bash
   solana config set --url devnet
   solana-keygen new  # 如果还没有钱包
   ```

3. **获取测试 SOL**:
   ```bash
   solana airdrop 2
   ```

## 使用方法

### 方法 1: 使用完整部署脚本（推荐）

这个脚本会自动部署程序并设置测试 token：

```bash
./scripts/deploy-and-setup-devnet.sh
```

### 方法 2: 分步执行

#### 步骤 1: 部署程序

```bash
# 构建程序
anchor build

# 部署到 devnet
anchor deploy --provider.cluster devnet
```

#### 步骤 2: 初始化分发器并创建测试 token

```bash
yarn deploy:devnet
```

或者直接运行：

```bash
ts-node scripts/deploy-devnet.ts
```

## 脚本说明

### `deploy-and-setup-devnet.sh`

完整的部署脚本，包括：
- 检查依赖
- 设置 devnet 集群
- 检查钱包和余额
- 构建程序
- 部署程序
- 初始化分发器
- 创建测试 token

### `deploy-devnet.ts`

TypeScript 脚本，用于：
- 连接到 devnet
- 加载程序
- 初始化分发器（如果尚未初始化）
- 创建 SPL Token mint
- 铸造测试 token 到 vault

## 输出信息

脚本会输出以下重要信息：

- **Program ID**: 程序的地址
- **Config PDA**: 分发器配置的 PDA 地址
- **Mint**: 测试 token 的 mint 地址
- **Token Vault**: token vault 的地址
- **Admin**: 管理员地址

## 环境变量

可以通过环境变量自定义钱包路径：

```bash
export ANCHOR_WALLET=~/.config/solana/id.json
yarn deploy:devnet
```

## 注意事项

1. 确保钱包有足够的 SOL（至少 2 SOL）用于部署和交易
2. 如果程序已经部署，脚本会跳过部署步骤
3. 如果分发器已经初始化，脚本会跳过初始化步骤
4. 测试 token 的 mint 每次运行都会创建新的，如果需要复用，请保存 mint 地址

## 故障排除

### 错误: IDL file not found

```bash
anchor build
```

### 错误: Insufficient funds

```bash
solana airdrop 2
```

### 错误: Program already deployed

这是正常的，脚本会继续执行后续步骤。

