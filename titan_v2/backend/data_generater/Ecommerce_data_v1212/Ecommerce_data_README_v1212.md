
## 数据集概述
- 数据场景：电商网点经营
- 数据范围：订单数据、用户数据、商品数据、用户行为数据、消息发送数据、优惠券数据

## ———————————— 以下内容不写入datacard ————————————— ##
## 模拟数据构造逻辑（这部分不写入datacard）
### 客户与订单管理
- 客户：所有有APP行为的用户累积写入cust全量表
- 客户的`open_date`：首次有APP行为的日期，作为客户生命周期的开始
- 订单累积逻辑：新客户首次下单初始化统计为0，后续每天累加历史订单数据，确保`orders_cnt`和`orders_gmv`反映真实累积值
- 客户生命周期：客户加入日期不晚于数据开始日期，最后访问日期基于实际APP行为设置，避免时间逻辑错误
- 客户表更新：新用户首次出现时加入全量表，老用户已存在；每日有APP行为的用户会累积更新到客户表
- ID映射关系：`open_id = 'op' + str(cust_id - 199)`确保客户ID与开放ID一一对应
### 商品状态管理
- 有效性控制：失效商品(`is_eligible='N'`)不会出现在订单中，不参与折扣活动；订单和APP行为只选择有效商品
- 折扣规则：折扣率`discount_rate`在0-1之间，`is_discounted=true`时小于1；购物节期间订单量增长50%-100%并提高折扣率
- 时间一致性：订单生成时间晚于或等于用户开户日期，商品状态与业务数据实时一致
### APP行为与订单关联
- 客户存在规则：所有客户都必须有APP行为才能存在，没有APP行为的客户不会被生成
- 客户日期规则：客户的`open_date`等于首次APP行为日期，确保时间逻辑一致性
- 行为绑定：有订单的用户当天必须产生APP行为，且至少访问一次下单商品的`product_page`；有购买行为的用户当天应有对应订单
- 会话管理：每个用户每天1-3个会话，每个会话2-5个行为；会话首个页面必须是入口页面(home_page/search_page)，通过`session_id`标识
- 时间逻辑：同一会话内行为时间严格递增，间隔1-5分钟；订单产生时间在用户当天APP行为时间范围内
- 行为范围：每天有app行为的用户不一定有order，但每天order对应的item在当天一定有效
### 消息与优惠券系统
- 消息发送：仅向当天客户表中的存量用户发送消息，每天随机选择一部分客户，有一一定的成功率
- 优惠券集成：每日向一部分存量用户发放优惠券，有效期7天，面额5-50元；发放、使用、过期状态与订单系统完全集成
- 优惠券类型区分：支持两种优惠券类型，通过`coupon_type_ratio`参数控制发放比例
  - 打折券（如8折、8.5折、9折）：在商品折扣价基础上再打折扣，折扣率从`coupon_discount_rates`列表中随机选择
  - 红包券（固定金额抵扣）：直接抵扣固定金额，金额从`coupon_discount_range`范围中随机生成
  - 订单金额计算：打折券订单金额 = 折扣价 × 折扣率；红包券订单金额 = 折扣价 - 抵扣金额
### 数据一致性保障
- 客户存在性验证：所有生成的客户都必须有对应的APP行为数据，确保客户数据与行为数据的完整一致性
- 客户日期验证：每个客户的`open_date`都等于其首次APP行为日期，保证时间逻辑的绝对准确
- 统计准确性：订单统计基于历史累积数据，新客户从0开始，老客户累积历史数据
- 时间序列：用户`last_visit_date`≥`open_date`，`create_timestamp`基于实际开户时间，消息发送时间与用户存在时间一致
- 业务逻辑：同一用户一天内可有多个订单；APP行为中访问的产品页面只选择当天有效商品
## 用户open data
- 客户存在逻辑变更：所有客户都必须有APP行为才能存在，确保客户数据与行为数据的完整一致性
- 客户日期逻辑变更：客户的`open_date`等于首次APP行为日期，保证时间逻辑的绝对准确
## 优惠券data
- 优惠券类型区分：新增两种优惠券类型支持
  - 打折券：支持8折、8.5折、9折等不同折扣率，在商品折扣价基础上再打折扣
  - 红包券：固定金额抵扣，直接减免商品折扣价
  - 智能计算：根据优惠券类型自动计算订单实际金额，打折券使用乘法，红包券使用减法
  - 灵活配置：通过`coupon_type_ratio`参数控制两种优惠券的发放比例
  - 数据字段：订单表新增`coupon_type`字段标识优惠券类型（discount/cash/none）

## ———————————— 以上内容不写入datacard ————————————— ##


## 概念说明
- 增量/incremental：每个分区只包含新增或发生变化的数据记录
- 全量/full：每个分区包含所有历史和截止当前分区的最新数据的完整快照。


## id范围
- item_id: 90001-90020  int  5位数  商品粒度
- cust_id: 1000001-1000250  int  7位数  账户粒度
- open_id: 'op' + (cust_id - 199)  str  7-8位数 账户粒度


## 数据表结构
### 1. 每日增量订单信息表 (daily_incremental_order.csv)
- 字段/COLUMNS: 
  - order_id: 订单唯一标识 (string)
  - cust_id: 客户ID (string)
  - item_id: 商品ID (string)
  - channel: 订单渠道 (string: 淘宝/拼多多)
  - original_price: 商品原价 (int)
  - is_discounted: 商品是否参与折扣 (string: Y/N)
  - discount_rate: 商品折扣率 (float: 0.7/0.8/0.9/等或无折扣)
  - discounted_price: 商品折扣后价格 (int)
  - coupon_discount: 优惠券抵扣金额 (int)
  - is_coupon_used: 是否使用优惠券 (string: Y/N)
  - coupon_id: 使用的优惠券ID (string)
  - coupon_discount: 优惠券抵扣金额 (int)
  - actual_amount: 订单实际支付金额 (int)
  - grass_date: 数据日期 (string: YYYY/MM/DD)
  - coupon_type: 优惠券类型 (string: discount/cash/none)
- 主键/PRIMARY KEY: order_id
- 分区/PARTITION: grass_date


### 2. 每日增量客户APP行为表 (daily_incremental_cust_app_behavior.csv)
- 字段/COLUMNS: 
  - biz_no: 行为记录唯一标识 (int)
  - open_id: 客户开放ID (string)
  - app_page: APP页面类型 (string: home_page/product_page/search_page/cart_page/profile_page)
  - action_type: 行为类型 (string: view/click/add_cart/purchase/search)
  - time_spent: 页面停留时间(毫秒) (int)
  - device_type: 设备类型 (string: iOS/Android/PC)
  - location: 地理位置 (string: 国内城市名)
  - action_time: 行为发生时间 (string: YYYY-MM-DD HH:MM:SS)
  - ip_city: IP所在城市 (string: 国内城市名)
  - page_value: 页面相关值 (string: 产品ID/分类名/空)
    - 当 `app_page` 为 'product_page' 时，表示用户访问的商品(item_id)
    - 当 `app_page` 为 'search_page' 时，表示搜索的商品分类(category)
    - 其他页面类型时，此字段为空
  - session_id: 会话ID (string: openid_日期_序号)
  - grass_date: 数据日期 (string: YYYY-MM-DD)
- 主键/PRIMARY KEY: biz_no
- 分区/PARTITION: grass_date （yyyy-mm-dd）



### 3. 每日全量客户信息表 (full_sync_cust.csv)
- 字段/COLUMNS: 
  - cust_id: 客户ID，累计包含所有有过APP行为的客户 (string)
  - open_id: 客户开放ID (string: 字母数字组合)
  - orders_cnt: 基于历史累积订单数据统计 (int)
  - sex: 性别 (int: 1:男, 0:女)
  - n_age: 年龄 (int: 18-65)
  - ltv_360d: 360天生命周期价值 (string: A/B/C)
  - open_date: 开户日期 (string: YYYY/MM/DD)
  - last_visit_date: 最后访问日期 (string: YYYY/MM/DD)
  - city_level: 城市等级 (int: 1:一线, 2:二线, 3:三线, 4:四线, 5:五线)
  - create_timestamp: 创建时间戳 (string: YYYY-MM-DD HH:MM:SS)
  - region: 地区 (string: 国内地区)
  - fixed_random_num: 每个用户的固定随机数(1-100) (int)
  - grass_date: 数据日期 (string: YYYY/MM/DD)
- 主键/PRIMARY KEY: cust_id,open_id,grass_date
- 分区/PARTITION: grass_date



### 4. 每日全量商品信息表 (full_sync_item.csv)
- 字段/COLUMNS: 
  - item_id: 商品ID (string: I{8位数字})
  - category: 商品分类 (string: 电子产品/服装/家居/美妆/食品/运动/图书/母婴)
  - is_eligible: 是否有效 (string: Y/N)
  - price: 商品价格 (int)
  - cost_price: 商品进价 (int)
  - is_discounted: 是否参与折扣 (string: Y/N)
  - discount_rate: 折扣率 (float: 0.7/0.8/0.9或无折扣)
  - rating: 商品评分 (int: 1-5) 
  - Origin: 商品产地 (string: 国内/日韩/欧美/东南亚/其他)
  - grass_date: 数据日期 (string: YYYY/MM/DD)
- 主键/PRIMARY KEY: item_id,grass_date
- 分区/PARTITION: grass_date


### 5. 每日增量消息发送表 (daily_incremental_message.csv)
- 字段/COLUMNS: 
  - message_id: 消息唯一标识 (string)
  - cust_id: 客户ID，支持给当天已经在用户表里的存量用户发送消息，允许同一客户每天接收多条消息 (string)
  - channel: 消息渠道 (string: 短信/电话)
  - is_success: 是否发送成功 (string: Y/N)
  - grass_date: 数据日期 (string: YYYY/MM/DD)
- 主键/PRIMARY KEY: message_id
- 分区/PARTITION: grass_date



### 6. 每日增量优惠券表 (daily_incremental_coupon.csv)
- 字段/COLUMNS: 
  - coupon_id: 优惠券唯一标识 (string)
  - cust_id: 客户ID，支持每日向一些用户发放优惠券 (string)
  - status: 优惠券状态 (string: 可用/已用/过期)
  - issue_date: 发放日期 (string: YYYY/MM/DD)
  - expiry_date: 过期日期，优惠券生效后xx天过期 (string: YYYY/MM/DD)
  - discount_amount: 优惠金额或折扣率 (float: 折扣率0.8/0.85/0.9等 或 int: 固定金额)
  - coupon_type: 优惠券类型 (string: discount/cash)
    - discount: 打折券，例如打8折
    - cash: 红包券，直接抵扣金额
  - used_date: 使用日期 (string: YYYY/MM/DD 或空)
  - used_order_id: 使用的订单ID (string: order_id 或 空)
  - grass_date: 数据日期 (string: YYYY/MM/DD)
- 主键/PRIMARY KEY: coupon_id
- 分区/PARTITION: grass_date




