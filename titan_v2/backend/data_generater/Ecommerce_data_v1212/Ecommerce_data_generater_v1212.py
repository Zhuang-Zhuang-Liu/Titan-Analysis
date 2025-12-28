#!/usr/bin/env python3
"""
生成模拟的电商分析数据，包括订单、用户行为、用户信息和商品数据
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import random
import os
from typing import List, Dict, Set

class CVRDataGenerator:
    def __init__(self, 
                 start_date: str = "2025-11-25",
                 end_date: str = "2025-12-01",
                 total_customers: int = 250,
                 total_items: int = 20,
                 daily_orders_range: tuple = (20, 40),
                 random_seed: int = 42,
                 non_ordering_ratio: int = 15,  # 无订单用户比例，默认15%
                 channels: List[str] = None,
                 categories: List[str] = None,
                 app_pages: List[str] = None,
                 entry_pages: List[str] = None,
                 action_types: List[str] = None,
                 device_types: List[str] = None,
                 regions: List[str] = None,
                 cities: List[str] = None,
                 location_cities: List[str] = None,
                 ip_cities: List[str] = None,
                 city_levels: List[int] = None,
                 ltv_levels: List[str] = None,
                 origins: List[str] = None,
                 message_channels: List[str] = None,
                 promotion_dates: List[str] = None,
                 daily_message_count_range: tuple = (20, 40),
                 allow_repeat_messages: bool = False,
                 daily_coupon_count_range: tuple = (80, 120),  # 每天优惠券发放数量范围，默认(80, 120)
                 coupon_valid_days: int = 7,  # 优惠券有效期天数
                 coupon_discount_range: tuple = (5, 50),  # 优惠券面额范围（红包券）
                 coupon_discount_rates: List[float] = None,  # 打折券折扣率列表，如[0.8, 0.9]表示8折、9折
                 coupon_type_ratio: float = 0.5,  # 打折券占比，默认50%
                 coupon_usage_rate_range: tuple = (0.2, 0.4)):  # 每天订单使用优惠券比例范围，默认(0.2, 0.4)

        self.start_date = datetime.strptime(start_date, "%Y-%m-%d")
        self.end_date = datetime.strptime(end_date, "%Y-%m-%d")
        self.total_customers = total_customers
        self.total_items = total_items
        self.daily_orders_range = daily_orders_range
        self.non_ordering_ratio = non_ordering_ratio  # 无订单用户比例参数
        self.promotion_dates = {datetime.strptime(date_str, "%Y-%m-%d").date() 
                               for date_str in promotion_dates} if promotion_dates else set()
        random.seed(random_seed)
        np.random.seed(random_seed)
        self.channels = channels
        self.categories = categories 
        self.app_pages = app_pages
        self.entry_pages = entry_pages
        self.action_types = action_types 
        self.device_types = device_types
        self.regions = regions 
        self.cities = cities 
        self.location_cities = location_cities
        self.ip_cities = ip_cities
        self.city_levels = city_levels 
        self.ltv_levels = ltv_levels 
        self.origins = origins 
        self.message_channels = message_channels if message_channels else ['短信', '电话']
        # 消息发送控制参数
        self.daily_message_count_range = daily_message_count_range
        self.allow_repeat_messages = allow_repeat_messages
        # 优惠券相关参数
        self.daily_coupon_count_range = daily_coupon_count_range
        self.coupon_valid_days = coupon_valid_days
        self.coupon_discount_range = coupon_discount_range
        self.coupon_discount_rates = coupon_discount_rates if coupon_discount_rates else [0.8, 0.85, 0.9]  # 默认打折券折扣率
        self.coupon_type_ratio = coupon_type_ratio  # 打折券占比
        self.coupon_usage_rate_range = coupon_usage_rate_range
        # 优惠券管理
        self.all_coupons = []  # 所有发放的优惠券
        self.coupon_id_counter = 1  # 优惠券ID计数器
        
        # 生成基础客户和商品数据
        self.customers = self._generate_base_customers()
        self.items = self._generate_base_items()
        
        # 跟踪已存在的客户
        self.existing_customers: Set[int] = set()
        # 新增：维护客户历史订单累积统计
        self.customer_order_stats = {}  # {cust_id: {'orders_cnt': 0, 'orders_gmv': 0.0}}
        # 新增：记录客户首次APP行为日期
        self.customer_first_behavior_date = {}  # {cust_id: first_behavior_date}
        
    def _generate_base_customers(self) -> Dict:
        """生成基础客户数据：潜在的全部客户，不一定是有app行为or有订单的客户
        """
        customers = {}
        for i in range(1, self.total_customers + 1):
            cust_id = 1000000 + i
            open_id = f"op{cust_id - 199}"
            customers[cust_id] = {
                'open_id': open_id,
                'sex': random.randint(0, 1),
                'n_age': random.randint(18, 70),
                'ltv_360d': random.choice(self.ltv_levels),
                'city_level': random.choice(self.city_levels),
                'region': random.choice(self.regions),
                'fixed_random_num': random.randint(1, 100)  # 固定随机数，范围1-100
            }
        return customers
    
    def _generate_base_items(self) -> Dict:
        """生成基础商品数据"""
        items = {}
        for i in range(1, self.total_items + 1):
            item_id = 90000 + i
            category = random.choice(self.categories)
            base_price = random.randint(50, 500)
            
            # 计算进价：商品价格的30%~60%
            cost_price = int(base_price * random.uniform(0.3, 0.6))
            
            items[item_id] = {
                'category': category,
                'base_price': base_price,
                'cost_price': cost_price,
                'rating': random.randint(1, 5),
                'origin': random.choice(self.origins)
            }
        return items
    
    def _calculate_order_amounts(self, item_id: int, date: datetime, coupon_discount: float = 0, coupon_type: str = 'none') -> dict:
        """计算订单金额：商品原价 -> 折扣价 -> 优惠券抵扣 -> 实际成交金额"""
        # 获取商品基础信息
        item_info = self.items[item_id]
        base_price = item_info['base_price']
        
        # 计算商品折扣价
        final_price, is_eligible, is_discounted, discount_rate = self._generate_item_price(base_price, date)
        
        # 根据优惠券类型计算实际成交金额
        if coupon_type == 'discount' and coupon_discount > 0:
            # 打折券：在折扣价基础上再打折扣
            actual_amount = max(0.01, final_price * coupon_discount)
        elif coupon_type == 'cash' and coupon_discount > 0:
            # 红包券：直接抵扣金额
            actual_amount = max(0.01, final_price - coupon_discount)
        else:
            # 无优惠券或优惠券无效
            actual_amount = max(0.01, final_price)
        
        return {
            'original_price': base_price,           # 商品原价
            'discounted_price': final_price,        # 折扣价（未使用优惠券）
            'actual_amount': round(actual_amount, 2), # 实际成交金额（使用优惠券后）
            'coupon_discount': coupon_discount,     # 优惠券抵扣金额
            'is_discounted': is_discounted,         # 是否打折
            'discount_rate': discount_rate
        }
    
    def _generate_item_price(self, base_price: int, date: datetime) -> tuple:
        """生成商品价格，考虑大促折扣"""
        # 检查是否是大促日期
        is_promotion_day = date.date() in self.promotion_dates
        is_discounted = False
        discount_rate = 0.0
        final_price = base_price
        
        if is_promotion_day and random.random() < 0.9:  # 大促日90%概率打折，折扣更大
            is_discounted = True
            discount_rate = round(random.uniform(0.2, 0.7), 1)  # 20%-70%折扣
            final_price = int(base_price * (1 - discount_rate))
        elif random.random() < 0.3:  # 平时30%概率打折
            is_discounted = True
            discount_rate = round(random.uniform(0.1, 0.3), 1)  # 10%-30%折扣
            final_price = int(base_price * (1 - discount_rate))
        
        # 随机设置商品是否有效
        is_eligible = 'Y' if random.random() < 0.9 else 'N'
        if not is_eligible:
            is_discounted = False
            discount_rate = 0.0
            final_price = base_price
            
        return final_price, is_eligible, is_discounted, discount_rate
    
    def _generate_app_behavior_time(self, date: datetime, session_start_time: datetime = None, previous_time: datetime = None) -> str:
        """生成APP行为时间（支持会话内时间顺序）"""
        if session_start_time is None:
            # 会话开始时间，随机生成
            hour = random.randint(0, 23)
            minute = random.randint(0, 59)
            second = random.randint(0, 59)
            return f"{date.strftime('%Y-%m-%d')} {hour:02d}:{minute:02d}:{second:02d}"
        else:
            # 后续行为时间，确保在会话开始之后，且按顺序递增
            if previous_time is None:
                previous_time = session_start_time
            
            # 生成递增的时间间隔（1-5分钟）
            time_interval = timedelta(minutes=random.randint(1, 5), seconds=random.randint(0, 59))
            next_time = previous_time + time_interval
            
            # 确保不跨天
            if next_time.date() > date.date():
                next_time = datetime.combine(date, datetime.max.time()) - timedelta(seconds=1)
            
            return next_time.strftime('%Y-%m-%d %H:%M:%S')
    
    def _generate_customer_join_date(self, current_date: datetime) -> str:
        """生成客户加入日期（在当前日期之前）"""
        # 确保加入日期不晚于数据生成开始日期
        max_days_back = min(60, (current_date - self.start_date).days + 1)
        days_ago = random.randint(1, max(1, max_days_back))
        join_date = current_date - timedelta(days=days_ago)
        return join_date.strftime('%Y/%m/%d')
    
    def generate_daily_orders(self, date: datetime) -> pd.DataFrame:
        """生成每日订单数据"""
        # 检查是否是大促日期，如果是则增加订单数量
        is_promotion_day = date.date() in self.promotion_dates
        
        if is_promotion_day:
            # 大促日订单数量增加50%-100%
            increase_rate = random.uniform(0.5, 1.0)
            min_orders = int(self.daily_orders_range[0] * (1 + increase_rate))
            max_orders = int(self.daily_orders_range[1] * (1 + increase_rate))
            daily_orders = random.randint(min_orders, max_orders)
        else:
            daily_orders = random.randint(*self.daily_orders_range)
            
        orders_data = []
        
        # 获取当天有订单的客户（这些客户当天必须有APP行为）
        ordering_customers = random.sample(list(self.customers.keys()), 
                                         min(daily_orders, len(self.customers)))
        
        # 预生成所有商品的价格信息，过滤出有效商品
        eligible_items = []
        for item_id, item_info in self.items.items():
            _, is_eligible, _, _ = self._generate_item_price(item_info['base_price'], date)
            if is_eligible == 'Y':
                eligible_items.append(item_id)
        
        # 如果没有有效商品，当天不产生订单
        if not eligible_items:
            return pd.DataFrame(columns=['order_id', 'cust_id', 'item_id', 'channel', 'original_price', 'discounted_price', 'actual_amount', 'coupon_discount', 'is_coupon_used', 'coupon_id', 'is_discounted', 'discount_rate', 'grass_date'])
        
        available_items = eligible_items
        
        for i in range(daily_orders):
            order_id = i + 1
            cust_id = ordering_customers[i % len(ordering_customers)]
            item_id = random.choice(available_items)
            channel = random.choice(self.channels)
            
            # 初始计算订单金额（未使用优惠券）
            order_amounts = self._calculate_order_amounts(item_id, date, 0)
            
            orders_data.append({
                'order_id': order_id,
                'cust_id': cust_id,
                'item_id': item_id,
                'channel': channel,
                'original_price': order_amounts['original_price'],
                'discounted_price': order_amounts['discounted_price'],
                'actual_amount': order_amounts['actual_amount'],
                'coupon_discount': order_amounts['coupon_discount'],

                'is_coupon_used': 'N',  # 默认值，后续在优惠券使用逻辑中更新
                'coupon_id': '',  # 默认值，后续在优惠券使用逻辑中更新
                'is_discounted': order_amounts['is_discounted'],
                'discount_rate': order_amounts['discount_rate'],
                'grass_date': date.strftime('%Y/%m/%d')
            })
            
            # 记录这些客户为已存在客户
            self.existing_customers.add(cust_id)
        
        return pd.DataFrame(orders_data)
    
    def generate_daily_app_behavior(self, date: datetime, daily_orders_df: pd.DataFrame) -> pd.DataFrame:
        """生成每日APP行为数据（支持会话管理）"""
        # 获取当天有订单的客户（必须有APP行为）
        ordering_customers = set(daily_orders_df['cust_id'].tolist())
        
        # 获取每个客户当天购买的产品ID
        customer_ordered_items = {}
        for _, order in daily_orders_df.iterrows():
            cust_id = order['cust_id']
            item_id = order['item_id']
            if cust_id not in customer_ordered_items:
                customer_ordered_items[cust_id] = []
            customer_ordered_items[cust_id].append(item_id)
        
        # 额外生成一些有APP行为但无订单的客户（参数控制比例）
        non_ordering_count = getattr(self, 'non_ordering_ratio', 15)  # 默认15%，可通过参数控制
        available_non_ordering = [c for c in self.customers.keys() if c not in ordering_customers]
        target_count = min(len(available_non_ordering), max(1, int(len(ordering_customers) * non_ordering_count / 100)))
        non_ordering_customers = random.sample(available_non_ordering, target_count)
        
        all_active_customers = list(ordering_customers) + non_ordering_customers
        
        # 预生成有效商品列表，用于APP行为中的产品访问
        eligible_items = []
        for item_id, item_info in self.items.items():
            _, is_eligible, _, _ = self._generate_item_price(item_info['base_price'], date)
            if is_eligible == 'Y':
                eligible_items.append(item_id)
        
        # 如果没有有效商品，使用空列表（APP行为中不访问产品页面）
        available_items = eligible_items
        
        behavior_data = []
        biz_no = 1
        
        for cust_id in all_active_customers:
            customer_info = self.customers[cust_id]
            
            # 为每个用户生成多个会话
            session_count = random.randint(1, 3)  # 每个用户1-3个会话
            
            for session_id in range(1, session_count + 1):
                # 每个会话生成多个行为
                behavior_count = random.randint(2, 5)  # 每个会话2-5个行为
                # 记录该客户是否已经访问过下单产品的product_page
                visited_ordered_products = set()
                # 生成会话开始时间
                session_start_time = datetime.strptime(
                    self._generate_app_behavior_time(date), '%Y-%m-%d %H:%M:%S'
                )
                previous_time = None
                
                for i in range(behavior_count):
                    # 第一个行为必须是entry page
                    if i == 0:
                        app_page = random.choice(self.entry_pages)
                    else:
                        # 后续行为可以是任何页面（包括entry page）
                        app_page = random.choice(self.app_pages)
                    
                    action_type = random.choice(self.action_types)
                    time_spent = random.randint(1000, 30000)  # 单位：毫秒，1秒到30秒
                    device_type = random.choice(self.device_types)
                    location = random.choice(self.location_cities)
                    
                    # 生成递增的行为时间
                    action_time = self._generate_app_behavior_time(date, session_start_time, previous_time)
                    previous_time = datetime.strptime(action_time, '%Y-%m-%d %H:%M:%S')
                    
                    ip_city = random.choice(self.ip_cities)
                    
                    # 设置page_value字段
                    page_value = ''
                    if app_page == 'product_page':
                        # 如果是下单客户，确保至少访问一次下单的产品
                        if cust_id in customer_ordered_items and customer_ordered_items[cust_id]:
                            # 第一次访问product_page时，选择下单的产品
                            if len(visited_ordered_products) == 0:
                                page_value = random.choice(customer_ordered_items[cust_id])
                                visited_ordered_products.add(page_value)
                            else:
                                # 后续随机选择是否继续访问下单产品或其他产品
                                if random.random() < 0.5 and len(visited_ordered_products) < len(customer_ordered_items[cust_id]):
                                    remaining_items = [item for item in customer_ordered_items[cust_id] if item not in visited_ordered_products]
                                    if remaining_items:
                                        page_value = random.choice(remaining_items)
                                        visited_ordered_products.add(page_value)
                                else:
                                    # 随机选择一个有效产品
                                    page_value = random.choice(available_items)
                        else:
                            # 非下单客户，随机选择一个有效产品
                            page_value = random.choice(available_items)
                    elif app_page == 'search_page':
                        page_value = random.choice(self.categories)
                    
                    behavior_data.append({
                        'biz_no': biz_no,
                        'open_id': customer_info['open_id'],
                        'session_id': f"{customer_info['open_id']}_{date.strftime('%Y%m%d')}_{session_id}",
                        'app_page': app_page,
                        'action_type': action_type,
                        'time_spent': time_spent,
                        'device_type': device_type,
                        'location': location,
                        'action_time': action_time,
                        'ip_city': ip_city,
                        'page_value': page_value,
                        'grass_date': date.strftime('%Y-%m-%d')
                    })
                    biz_no += 1
        
        return pd.DataFrame(behavior_data)
    
    def generate_daily_customers(self, date: datetime, daily_orders_df: pd.DataFrame, daily_behaviors_df: pd.DataFrame = None) -> pd.DataFrame:
        """生成每日客户全量数据（只包含有APP行为的客户）"""
        
        # 获取当天有APP行为的活跃客户
        active_customers = set()
        if daily_behaviors_df is not None:
            active_customers = set(daily_behaviors_df['open_id'].apply(lambda x: int(x.replace('op', '')) + 199).tolist())
        
        # 新客户：当天有APP行为但之前没有记录的客户
        new_customers = active_customers - self.existing_customers
        
        # 记录新客户首次APP行为日期
        for cust_id in new_customers:
            if cust_id not in self.customer_first_behavior_date:
                self.customer_first_behavior_date[cust_id] = date
        
        # 初始化所有有APP行为客户的订单统计（仅统计订单数量）
        for cust_id in active_customers:
            if cust_id not in self.customer_order_stats:
                self.customer_order_stats[cust_id] = {'orders_cnt': 0}
        
        # 更新累积订单统计：加上当天的订单数据
        for cust_id in daily_orders_df['cust_id'].unique():
            customer_orders = daily_orders_df[daily_orders_df['cust_id'] == cust_id]
            daily_orders_cnt = len(customer_orders)
            
            if cust_id not in self.customer_order_stats:
                # 这个客户之前从未有过订单，需要初始化
                self.customer_order_stats[cust_id] = {'orders_cnt': 0}
            
            self.customer_order_stats[cust_id]['orders_cnt'] += daily_orders_cnt
        
        # 只包含有APP行为的客户（历史+新增）
        all_customers_today = list(active_customers)
        
        customers_data = []
        
        for cust_id in all_customers_today:
            customer_info = self.customers[cust_id]
            
            # 直接使用累积的订单统计（前面已确保所有用户都在customer_order_stats中）
            orders_cnt = self.customer_order_stats[cust_id]['orders_cnt']
            
            # 生成客户加入日期：必须等于首次APP行为日期
            # 确保客户有首次行为日期记录
            if cust_id not in self.customer_first_behavior_date:
                # 如果由于某种原因没有记录，使用当前日期作为首次行为日期
                self.customer_first_behavior_date[cust_id] = date
            
            open_date = self.customer_first_behavior_date[cust_id].strftime('%Y/%m/%d')
            
            # 最后访问日期基于实际APP行为数据
            last_visit_date = date.strftime('%Y/%m/%d')
            
            create_timestamp = f"{date.strftime('%Y/%m/%d')} 0:00"
            
            customers_data.append({
                'cust_id': cust_id,
                'open_id': customer_info['open_id'],
                'orders_cnt': orders_cnt,
                'sex': customer_info['sex'],
                'n_age': customer_info['n_age'],
                'ltv_360d': customer_info['ltv_360d'],
                'open_date': open_date,
                'last_visit_date': last_visit_date,
                'city_level': customer_info['city_level'],
                'create_timestamp': create_timestamp,
                'region': customer_info['region'],
                'fixed_random_num': customer_info['fixed_random_num'],  # 固定随机数
                'grass_date': date.strftime('%Y/%m/%d')
            })
        
        return pd.DataFrame(customers_data)
    
    def generate_daily_items(self, date: datetime) -> pd.DataFrame:
        """生成每日商品全量数据"""
        items_data = []
        
        for item_id, item_info in self.items.items():
            price, is_eligible, is_discounted, discount_rate = self._generate_item_price(
                item_info['base_price'], date
            )
            
            items_data.append({
                'item_id': item_id,
                'category': item_info['category'],
                'is_eligible': is_eligible,
                'price': price,
                'cost_price': item_info['cost_price'],
                'is_discounted': is_discounted,
                'discount_rate': discount_rate,
                'rating': item_info['rating'],
                'Origin': item_info['origin'],
                'grass_date': date.strftime('%Y/%m/%d')
            })
        
        return pd.DataFrame(items_data)
    
    def _generate_coupon_id(self) -> str:
        """生成优惠券ID"""
        coupon_id = f"CP{self.coupon_id_counter:08d}"
        self.coupon_id_counter += 1
        return coupon_id
    
    def generate_daily_coupons(self, date: datetime, daily_customers_df: pd.DataFrame) -> pd.DataFrame:
        """生成每日优惠券发放数据"""
        # 获取当天全量客户表中的客户（存量用户）
        available_customers = daily_customers_df['cust_id'].tolist()
        
        # 从存量用户中随机选择用户发放优惠券（使用参数范围控制）
        min_coupons, max_coupons = self.daily_coupon_count_range
        daily_coupon_count = random.randint(min_coupons, max_coupons)
        coupon_count = min(daily_coupon_count, len(available_customers))
        selected_customers = random.sample(available_customers, coupon_count)
        
        coupons_data = []
        
        for cust_id in selected_customers:
            coupon_id = self._generate_coupon_id()
            issue_date = date.strftime('%Y/%m/%d')
            expire_date = (date + timedelta(days=self.coupon_valid_days)).strftime('%Y/%m/%d')
            
            # 随机决定优惠券类型
            is_discount_coupon = random.random() < self.coupon_type_ratio
            
            if is_discount_coupon:
                # 打折券
                discount_rate = random.choice(self.coupon_discount_rates)
                discount_amount = discount_rate  # 保存折扣率
                coupon_type = 'discount'
            else:
                # 红包券
                discount_amount = random.randint(*self.coupon_discount_range)
                coupon_type = 'cash'
            
            coupon_info = {
                'coupon_id': coupon_id,
                'cust_id': cust_id,
                'status': '可用',
                'issue_date': issue_date,
                'expire_date': expire_date,
                'discount_amount': discount_amount,
                'coupon_type': coupon_type,
                'used_date': '',
                'used_order_id': '',
                'grass_date': date.strftime('%Y/%m/%d')
            }
            
            coupons_data.append(coupon_info)
            self.all_coupons.append(coupon_info)
        
        return pd.DataFrame(coupons_data)
    
    def _update_coupon_status_for_usage(self, date: datetime):
        """更新优惠券状态（处理使用和过期）"""
        current_date = date.date()
        
        for coupon in self.all_coupons:
            # 跳过已经使用的优惠券
            if coupon['status'] == '已用':
                continue
                
            # 检查是否过期
            expire_date = datetime.strptime(coupon['expire_date'], '%Y/%m/%d').date()
            if current_date > expire_date:
                coupon['status'] = '过期'
                continue
    
    def _apply_coupons_to_orders(self, daily_orders_df: pd.DataFrame, date: datetime) -> pd.DataFrame:
        """将优惠券应用到订单"""
        # 获取当天可用的优惠券（状态为'可用'且未过期）
        available_coupons = []
        for coupon in self.all_coupons:
            if coupon['status'] == '可用':
                expire_date = datetime.strptime(coupon['expire_date'], '%Y/%m/%d').date()
                if date.date() <= expire_date:
                    available_coupons.append(coupon)
        
        if not available_coupons:
            daily_orders_df['coupon_discount'] = 0
            daily_orders_df['coupon_type'] = 'none'
            daily_orders_df['coupon_id'] = ''
            return daily_orders_df
        
        # 为每个订单随机决定是否使用优惠券
        for idx, order in daily_orders_df.iterrows():
            cust_id = order['cust_id']
            
            # 获取该用户可用的优惠券
            user_available_coupons = [c for c in available_coupons if c['cust_id'] == cust_id]
            
            if not user_available_coupons:
                continue
            
            # 根据使用率决定是否使用优惠券（使用参数范围控制）
            min_rate, max_rate = self.coupon_usage_rate_range
            daily_usage_rate = random.uniform(min_rate, max_rate)
            if random.random() < daily_usage_rate:
                # 随机选择一个优惠券使用
                selected_coupon = random.choice(user_available_coupons)
                
                # 根据优惠券类型重新计算实际成交金额
                discounted_price = order['discounted_price']
                if selected_coupon['coupon_type'] == 'discount':
                    # 打折券：在折扣价基础上再打折扣
                    actual_amount = max(0.01, discounted_price * selected_coupon['discount_amount'])
                elif selected_coupon['coupon_type'] == 'cash':
                    # 红包券：直接抵扣金额
                    actual_amount = max(0.01, discounted_price - selected_coupon['discount_amount'])
                else:
                    actual_amount = discounted_price
                
                # 更新订单信息
                daily_orders_df.at[idx, 'actual_amount'] = round(actual_amount, 2)
                daily_orders_df.at[idx, 'is_coupon_used'] = 'Y'
                daily_orders_df.at[idx, 'coupon_discount'] = selected_coupon['discount_amount']
                daily_orders_df.at[idx, 'coupon_type'] = selected_coupon['coupon_type']
                daily_orders_df.at[idx, 'coupon_id'] = selected_coupon['coupon_id']
                
                # 更新优惠券信息
                selected_coupon['status'] = '已用'
                selected_coupon['used_date'] = date.strftime('%Y/%m/%d')
                selected_coupon['used_order_id'] = str(order['order_id'])
                
                # 从可用优惠券列表中移除，避免重复使用
                available_coupons.remove(selected_coupon)
        
        # 为未使用优惠券的订单设置默认值
        daily_orders_df['coupon_discount'] = daily_orders_df['coupon_discount'].fillna(0)
        daily_orders_df['coupon_type'] = daily_orders_df['coupon_type'].fillna('none')
        daily_orders_df['coupon_id'] = daily_orders_df['coupon_id'].fillna('')
        
        return daily_orders_df
    
    def _get_all_coupons_current_status(self, date: datetime) -> pd.DataFrame:
        """获取所有优惠券的当前状态"""
        # 更新所有优惠券的状态（处理过期）
        self._update_coupon_status_for_usage(date)
        
        # 为每个优惠券创建一条记录，包含当前状态
        coupons_data = []
        for coupon in self.all_coupons:
            # 创建当前状态的记录
            current_status_record = coupon.copy()
            current_status_record['grass_date'] = date.strftime('%Y/%m/%d')
            coupons_data.append(current_status_record)
        
        return pd.DataFrame(coupons_data)
    
    def generate_daily_messages(self, date: datetime, daily_customers_df: pd.DataFrame) -> pd.DataFrame:
        """生成每日消息发送数据"""
        # 获取当天全量客户表中的客户（存量用户）
        available_customers = daily_customers_df['cust_id'].tolist()
        
        # 根据参数控制每日消息发送数量
        min_messages, max_messages = self.daily_message_count_range
        message_count = random.randint(min_messages, max_messages)
        
        messages_data = []
        message_id = 1
        
        if self.allow_repeat_messages:
            # 允许重复发送：每个消息独立随机选择客户
            for _ in range(message_count):
                cust_id = random.choice(available_customers)
                channel = random.choice(self.message_channels)
                # 90%的概率发送成功
                is_success = 'Y' if random.random() < 0.9 else 'N'
                
                messages_data.append({
                    'message_id': message_id,
                    'cust_id': cust_id,
                    'channel': channel,
                    'is_success': is_success,
                    'grass_date': date.strftime('%Y/%m/%d')
                })
                message_id += 1
        else:
            # 不允许重复发送：每个客户最多一条消息
            selected_customers = random.sample(available_customers, 
                                             min(message_count, len(available_customers)))
            
            for cust_id in selected_customers:
                channel = random.choice(self.message_channels)
                # 90%的概率发送成功
                is_success = 'Y' if random.random() < 0.9 else 'N'
                
                messages_data.append({
                    'message_id': message_id,
                    'cust_id': cust_id,
                    'channel': channel,
                    'is_success': is_success,
                    'grass_date': date.strftime('%Y/%m/%d')
                })
                message_id += 1
        
        return pd.DataFrame(messages_data)
    
    def generate_all_data(self, output_dir: str = "."):
        """生成所有日期的数据"""
        os.makedirs(output_dir, exist_ok=True)
        
        all_orders = []
        all_behaviors = []
        all_customers = []
        all_items = []
        all_messages = []
        all_coupons = []  # 新增：所有优惠券数据
        
        current_date = self.start_date
        order_id_offset = 0
        message_id_offset = 0
        
        while current_date <= self.end_date:
            print(f"生成 {current_date.strftime('%Y-%m-%d')} 的数据...")
            
            # 生成每日订单
            daily_orders = self.generate_daily_orders(current_date)
            
            # 生成每日APP行为
            daily_behaviors = self.generate_daily_app_behavior(current_date, daily_orders)
            
            # 生成每日客户数据
            daily_customers = self.generate_daily_customers(current_date, daily_orders, daily_behaviors)
            
            # 生成每日优惠券（基于当天客户数据）
            daily_coupons = self.generate_daily_coupons(current_date, daily_customers)
            
            # 应用优惠券到订单
            daily_orders = self._apply_coupons_to_orders(daily_orders, current_date)
            
            # 更新优惠券状态（处理过期）
            self._update_coupon_status_for_usage(current_date)
            
            daily_orders['order_id'] += order_id_offset
            all_orders.append(daily_orders)
            all_behaviors.append(daily_behaviors)
            all_customers.append(daily_customers)
            
            # 更新已存在客户集合：包含所有有APP行为的用户
            today_active_customers = set(daily_behaviors['open_id'].apply(lambda x: int(x.replace('op', '')) + 199).tolist())
            self.existing_customers.update(today_active_customers)
            
            # 生成每日商品数据
            daily_items = self.generate_daily_items(current_date)
            all_items.append(daily_items)
            
            # 生成每日消息发送数据（基于当天全量客户表）
            daily_messages = self.generate_daily_messages(current_date, daily_customers)
            daily_messages['message_id'] += message_id_offset
            all_messages.append(daily_messages)
            
            # 收集所有优惠券状态（包括历史优惠券的当前状态）
            daily_all_coupons = self._get_all_coupons_current_status(current_date)
            all_coupons.append(daily_all_coupons)
            
            message_id_offset += len(daily_messages)
            order_id_offset += len(daily_orders)
            current_date += timedelta(days=1)
        
        # 合并所有数据
        final_orders = pd.concat(all_orders, ignore_index=True)
        final_behaviors = pd.concat(all_behaviors, ignore_index=True)
        final_customers = pd.concat(all_customers, ignore_index=True)
        final_items = pd.concat(all_items, ignore_index=True)
        final_messages = pd.concat(all_messages, ignore_index=True)
        final_coupons = pd.concat(all_coupons, ignore_index=True)
        
        # 保存数据
        final_orders.to_csv(os.path.join(output_dir, 'daily_incremental_order.csv'), index=False)
        final_behaviors.to_csv(os.path.join(output_dir, 'daily_incremental_cust_app_behavior.csv'), index=False)
        final_customers.to_csv(os.path.join(output_dir, 'full_sync_cust.csv'), index=False)
        final_items.to_csv(os.path.join(output_dir, 'full_sync_item.csv'), index=False)
        final_messages.to_csv(os.path.join(output_dir, 'daily_incremental_message.csv'), index=False)
        final_coupons.to_csv(os.path.join(output_dir, 'daily_incremental_coupon.csv'), index=False)  # 新增优惠券文件
        
        print(f"数据生成完成！")
        print(f"订单数据: {len(final_orders)} 条")
        print(f"APP行为数据: {len(final_behaviors)} 条")
        print(f"客户数据: {len(final_customers)} 条")
        print(f"商品数据: {len(final_items)} 条")
        print(f"消息发送数据: {len(final_messages)} 条")
        print(f"优惠券数据: {len(final_coupons)} 条")
        
        return final_orders, final_behaviors, final_customers, final_items, final_messages, final_coupons

def main():
    generator = CVRDataGenerator(
        start_date="2025-11-20",
        end_date="2025-12-28",
        non_ordering_ratio=80,  # 百分比，0-100，无订单用户比例，默认15%
        total_customers=3000,
        total_items=200,
        daily_orders_range=(20, 50),
        random_seed=42,
        channels=['淘宝','拼多多'],
        categories=['服装', '数码', '食品'],  # 也是搜索页的value
        app_pages=['home_page', 'product_page', 'search_page', 'profile_page', 'cart_page'],
        entry_pages=['home_page'],  # 入口页面
        action_types=['click', 'scroll', 'input', 'swipe', 'tap'],
        device_types=['mobile', 'tablet', 'desktop'],
        regions=['华东', '西南'],
        cities=['上海', '深圳', '北京', '成都', '杭州', '广州', '南京', '武汉'],
        location_cities=['上海', '深圳', '北京', '成都', '杭州', '广州', '南京', '武汉', '西安', '重庆'],
        ip_cities=['上海', '深圳', '北京', '成都', '杭州', '广州', '南京', '武汉', '苏州', '天津'],
        city_levels=[1, 2, 3, 4, 5],
        ltv_levels= ['A', 'B', 'C'],
        origins=['浙江', '广东', '江苏', '福建', '山东'],  # 商品产地
        promotion_dates=['2025-11-11', '2025-12-12'],  # 大促日期
        daily_message_count_range=(30, 60),  # 每日消息发送数量范围，默认(20, 40)
        allow_repeat_messages=False,  # 是否允许同一客户每天接收多条消息，默认False
        daily_coupon_count_range=(100, 100),  # 每日发放优惠券数量范围，默认(80, 120)
        coupon_valid_days=7,  # 优惠券有效期天数
        coupon_discount_range=(5, 50),  # 红包券面额范围
        coupon_discount_rates=[0.8, 0.85, 0.9],  # 打折券折扣率：8折、8.5折、9折
        coupon_type_ratio=0.5  # 50%打折券，50%红包券
    )
    
    # path: backend/work_dataset
    current_file_dir = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.dirname(os.path.dirname(current_file_dir))  # 获取backend目录
    output_dir = os.path.join(backend_dir, 'work_dataset')  # backend/work_dataset
    
    # 确保输出目录存在
    os.makedirs(output_dir, exist_ok=True)
    
    generator.generate_all_data(output_dir)

if __name__ == "__main__":
    main()