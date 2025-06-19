## Usage

### `./utils/snowflake` - 雪花算法

通用部分示例：
```ts
import { Snowflake } from '@timi137/node-utils'

// 不同节点使用不同的 workerId
const node1Generator = new Snowflake(1, 0); // 节点 1
const node2Generator = new Snowflake(2, 0); // 节点 2

// 同一节点不同进程使用不同 processId
const processAGenerator = new Snowflake(1, 1); // 进程 A
const processBGenerator = new Snowflake(1, 2); // 进程 B

const id = node1Generator.nextId();
console.log(id); // 输出: "1234567890123456789" (字符串形式)

// 分解 ID 的所有部分
const parts = Snowflake.decompose(id);
console.log(parts);
/* 输出:
{
  timestamp: 1735689600000,
  workerId: 1,
  processId: 1,
  sequence: 0
}
*/
```

总计 64 位长整数类型，以字符串形式返回。
具体格式如下：

```text
[时间戳 41位] [节点ID 5位] [进程ID 5位] [序列号 12位]
```

为了保证能尽可能长的有效期，我将 EPOCH 设置为 2025 年 1 月 1 日。

也就是说理论上，这个算法最多能使用到 2094 年。

最高支持 32 个节点，每个节点最多支持 32 个进程。 每个节点每毫秒最多生成 4096 个 ID。 理论上每个节点每秒最多生成 4096 * 1000 = 4,194,304 个 ID。

**务必注意：有的环境并不支持 `Atomics.wait` 可能会导致 CPU 消耗较高**

#### 故障排除

| 问题现象                      | 可能原因                  | 解决方案          |
|---------------------------|-----------------------|---------------|
| Worker ID must be...      | workerId 超出 0-31 范围   | 检查分配的值        |
| Process ID must be...     | processId 超出 0-31 范围  | 检查分配的值        |
| Clock moved backwards     | 系统时钟回拨                | 检查 NTP 同步     |
| Clock advancement stalled | 连续 50 次等待时间未推进        | 检查系统时间服务是否正常  |
| 生成的 ID 重复                 | workerId/processId 冲突 | 确保每个节点使用唯一标识符 |

---
