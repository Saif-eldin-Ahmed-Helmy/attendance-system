export interface Item {
    oldItemId: string;
    itemId: string;
    name: string;
    picture: string;
    stock: number;
    price: number;
    description: string;
    category: string;
    subCategory: string;
    deleted: boolean;
}