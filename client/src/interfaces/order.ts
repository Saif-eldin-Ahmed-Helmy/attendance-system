import {OrderItem} from "./orderItem.ts";

interface OrderTrace {
    type: 'placed' | 'preparing' | 'delivering' | 'delivered' | 'cancelled';
    date: string;
    executor: string;
    active: boolean;
}

interface CouponCode {
    code: string;
    expiryDate: string;
    discount: number;
    discountType: 'percentage' | 'amount';
    couponType: 'order' | 'item';
    itemId?: string;
    maximumAmount?: number;
}

export interface Order {
    orderId: number;
    date: string;
    trace: OrderTrace[];
    items: OrderItem[];
    couponCodes: CouponCode[];
    location: Location;
    amount: number;
    finalAmount: number;
    rating: number;
    comment: string;
    userRating: number;
    userComment: string;
    driverRating: number;
    driverComment: string;
}