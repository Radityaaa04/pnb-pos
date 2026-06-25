import { describe, it, expect, beforeEach } from 'vitest';
import { useCartStore, Product } from '@/store/useCartStore';

const mockProduct: Product = {
  id: 'prod-1',
  name: 'Kopi Susu Aren',
  price: 25000,
  category: 'Minuman',
  stock: 50,
};

const mockProduct2: Product = {
  id: 'prod-2',
  name: 'Americano',
  price: 20000,
  category: 'Minuman',
  stock: 30,
};

describe('useCartStore', () => {
  beforeEach(() => {
    useCartStore.setState({ items: [] });
  });

  describe('addItem', () => {
    it('adds a new product to the cart with quantity 1', () => {
      useCartStore.getState().addItem(mockProduct);
      const items = useCartStore.getState().items;
      expect(items).toHaveLength(1);
      expect(items[0]).toMatchObject({
        id: 'prod-1',
        name: 'Kopi Susu Aren',
        quantity: 1,
      });
    });

    it('increments quantity when adding an existing product', () => {
      useCartStore.getState().addItem(mockProduct);
      useCartStore.getState().addItem(mockProduct);
      const items = useCartStore.getState().items;
      expect(items).toHaveLength(1);
      expect(items[0].quantity).toBe(2);
    });

    it('adds multiple different products', () => {
      useCartStore.getState().addItem(mockProduct);
      useCartStore.getState().addItem(mockProduct2);
      const items = useCartStore.getState().items;
      expect(items).toHaveLength(2);
    });
  });

  describe('removeItem', () => {
    it('removes a product from the cart by id', () => {
      useCartStore.getState().addItem(mockProduct);
      useCartStore.getState().addItem(mockProduct2);
      useCartStore.getState().removeItem('prod-1');
      const items = useCartStore.getState().items;
      expect(items).toHaveLength(1);
      expect(items[0].id).toBe('prod-2');
    });

    it('does nothing when removing a non-existent product', () => {
      useCartStore.getState().addItem(mockProduct);
      useCartStore.getState().removeItem('non-existent');
      expect(useCartStore.getState().items).toHaveLength(1);
    });
  });

  describe('updateQuantity', () => {
    it('updates quantity to a specific value', () => {
      useCartStore.getState().addItem(mockProduct);
      useCartStore.getState().updateQuantity('prod-1', 5);
      expect(useCartStore.getState().items[0].quantity).toBe(5);
    });

    it('removes item when quantity is set to 0', () => {
      useCartStore.getState().addItem(mockProduct);
      useCartStore.getState().updateQuantity('prod-1', 0);
      expect(useCartStore.getState().items).toHaveLength(0);
    });

    it('removes item when quantity is negative', () => {
      useCartStore.getState().addItem(mockProduct);
      useCartStore.getState().updateQuantity('prod-1', -1);
      expect(useCartStore.getState().items).toHaveLength(0);
    });

    it('does not affect other items', () => {
      useCartStore.getState().addItem(mockProduct);
      useCartStore.getState().addItem(mockProduct2);
      useCartStore.getState().updateQuantity('prod-1', 3);
      const items = useCartStore.getState().items;
      expect(items[0].quantity).toBe(3);
      expect(items[1].quantity).toBe(1);
    });
  });

  describe('clearCart', () => {
    it('removes all items from the cart', () => {
      useCartStore.getState().addItem(mockProduct);
      useCartStore.getState().addItem(mockProduct2);
      useCartStore.getState().clearCart();
      expect(useCartStore.getState().items).toHaveLength(0);
    });

    it('works on an already empty cart', () => {
      useCartStore.getState().clearCart();
      expect(useCartStore.getState().items).toHaveLength(0);
    });
  });

  describe('getTotal', () => {
    it('returns 0 for an empty cart', () => {
      expect(useCartStore.getState().getTotal()).toBe(0);
    });

    it('calculates total for a single item', () => {
      useCartStore.getState().addItem(mockProduct);
      expect(useCartStore.getState().getTotal()).toBe(25000);
    });

    it('calculates total for multiple items with quantities', () => {
      useCartStore.getState().addItem(mockProduct);
      useCartStore.getState().addItem(mockProduct2);
      useCartStore.getState().updateQuantity('prod-1', 2);
      // 2 * 25000 + 1 * 20000 = 70000
      expect(useCartStore.getState().getTotal()).toBe(70000);
    });

    it('recalculates after item removal', () => {
      useCartStore.getState().addItem(mockProduct);
      useCartStore.getState().addItem(mockProduct2);
      useCartStore.getState().removeItem('prod-1');
      expect(useCartStore.getState().getTotal()).toBe(20000);
    });
  });
});
