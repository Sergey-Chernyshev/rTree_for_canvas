interface Shape {
    getBoundingBox(): BoundingBox;
    intersects(other: Shape): boolean;
    contains(other: Shape): boolean;
    area(): number;
}

class BoundingBox implements Shape {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;

    constructor(minX: number, minY: number, maxX: number, maxY: number) {
        this.minX = minX;
        this.minY = minY;
        this.maxX = maxX;
        this.maxY = maxY;
    }

    getBoundingBox(): BoundingBox {
        return this;
    }

    intersects(other: Shape): boolean {
        const otherBox = other.getBoundingBox();
        return !(
            this.maxX < otherBox.minX ||
            this.minX > otherBox.maxX ||
            this.maxY < otherBox.minY ||
            this.minY > otherBox.maxY
        );
    }

    contains(other: Shape): boolean {
        const otherBox = other.getBoundingBox();
        return (
            this.minX <= otherBox.minX &&
            this.maxX >= otherBox.maxX &&
            this.minY <= otherBox.minY &&
            this.maxY >= otherBox.maxY
        );
    }

    expandToInclude(other: Shape): void {
        const otherBox = other.getBoundingBox();
        this.minX = Math.min(this.minX, otherBox.minX);
        this.minY = Math.min(this.minY, otherBox.minY);
        this.maxX = Math.max(this.maxX, otherBox.maxX);
        this.maxY = Math.max(this.maxY, otherBox.maxY);
    }

    area(): number {
        return (this.maxX - this.minX) * (this.maxY - this.minY);
    }
}

class Circle implements Shape {
    centerX: number;
    centerY: number;
    radius: number;

    constructor(centerX: number, centerY: number, radius: number) {
        this.centerX = centerX;
        this.centerY = centerY;
        this.radius = radius;
    }

    getBoundingBox(): BoundingBox {
        return new BoundingBox(
            this.centerX - this.radius,
            this.centerY - this.radius,
            this.centerX + this.radius,
            this.centerY + this.radius
        );
    }

    intersects(other: Shape): boolean {
        const otherBox = other.getBoundingBox();
        const thisBox = this.getBoundingBox();
        if (!thisBox.intersects(otherBox)) {
            return false;
        }
        // Для простоты используем пересечение bounding box
        return true;
    }

    contains(other: Shape): boolean {
        const otherBox = other.getBoundingBox();
        const dx = Math.max(Math.abs(otherBox.minX - this.centerX), Math.abs(otherBox.maxX - this.centerX));
        const dy = Math.max(Math.abs(otherBox.minY - this.centerY), Math.abs(otherBox.maxY - this.centerY));
        return dx * dx + dy * dy <= this.radius * this.radius;
    }

    area(): number {
        return Math.PI * this.radius * this.radius;
    }
}

class Polygon implements Shape {
    points: { x: number; y: number }[];

    constructor(points: { x: number; y: number }[]) {
        this.points = points;
    }

    getBoundingBox(): BoundingBox {
        const xs = this.points.map(p => p.x);
        const ys = this.points.map(p => p.y);
        return new BoundingBox(
            Math.min(...xs),
            Math.min(...ys),
            Math.max(...xs),
            Math.max(...ys)
        );
    }

    intersects(other: Shape): boolean {
        const otherBox = other.getBoundingBox();
        const thisBox = this.getBoundingBox();
        if (!thisBox.intersects(otherBox)) {
            return false;
        }
        // Для простоты используем пересечение bounding box
        return true;
    }

    contains(other: Shape): boolean {
        const otherBox = other.getBoundingBox();
        const thisBox = this.getBoundingBox();
        if (!thisBox.contains(otherBox)) {
            return false;
        }
        // Для простоты предполагаем, что containment основан на bounding box
        return true;
    }

    area(): number {
        let area = 0;
        const n = this.points.length;
        for (let i = 0; i < n; i++) {
            const { x: x1, y: y1 } = this.points[i];
            const { x: x2, y: y2 } = this.points[(i + 1) % n];
            area += x1 * y2 - x2 * y1;
        }
        return Math.abs(area) / 2;
    }
}

class TreeElement<T> {
    shape: Shape;
    child: RTreeNode<T> | null;
    data: T | null;

    constructor(shape: Shape, child: RTreeNode<T> | null = null, data: T | null = null) {
        this.shape = shape;
        this.child = child;
        this.data = data;
    }

    isLeafElement(): boolean {
        return this.data !== null;
    }

    getBoundingBox(): BoundingBox {
        return this.shape.getBoundingBox();
    }
}

class RTreeNode<T> {
    elements: TreeElement<T>[];
    isLeaf: boolean;
    parent: RTreeNode<T> | null;

    constructor(isLeaf: boolean = true) {
        this.elements = [];
        this.isLeaf = isLeaf;
        this.parent = null;
    }

    addElement(element: TreeElement<T>): void {
        this.elements.push(element);
        if (element.child) {
            element.child.parent = this;
        }
    }

    removeElement(element: TreeElement<T>): void {
        const index = this.elements.indexOf(element);
        if (index !== -1) {
            this.elements.splice(index, 1);
            if (element.child) {
                element.child.parent = null;
            }
        }
    }

    getMBR(): BoundingBox | null {
        if (this.elements.length === 0) return null;
        const firstMBR = this.elements[0].getBoundingBox();
        const mbr = new BoundingBox(firstMBR.minX, firstMBR.minY, firstMBR.maxX, firstMBR.maxY);
        for (let i = 1; i < this.elements.length; i++) {
            mbr.expandToInclude(this.elements[i].shape);
        }
        return mbr;
    }

    split(): [RTreeNode<T>, RTreeNode<T>] {
        // Используем линейное разделение для простоты
        const sortedElements = this.elements.slice().sort((a, b) => {
            const aMBR = a.getBoundingBox();
            const bMBR = b.getBoundingBox();
            return aMBR.minX - bMBR.minX;
        });

        const mid = Math.floor(sortedElements.length / 2);
        const leftElements = sortedElements.slice(0, mid);
        const rightElements = sortedElements.slice(mid);

        const leftNode = new RTreeNode<T>(this.isLeaf);
        leftElements.forEach((element: TreeElement<T>) => {
            leftNode.addElement(element);
        });

        const rightNode = new RTreeNode<T>(this.isLeaf);
        rightElements.forEach((element: TreeElement<T>) => {
            rightNode.addElement(element);
        });

        return [leftNode, rightNode];
    }
}

class RTree<T extends { id: number; name: string }> {
    maxEntries: number;
    minEntries: number;
    root: RTreeNode<T>;

    constructor(maxEntries: number = 4) {
        this.maxEntries = maxEntries;
        this.minEntries = Math.floor(maxEntries / 2);
        this.root = new RTreeNode<T>(true);
    }

    insert(data: T, shape: Shape): void {
        const element = new TreeElement<T>(shape, null, data);
        this._insert(element, this.root);

        if (this.root.elements.length > this.maxEntries) {
            this._splitRoot();
        }
    }

    private _insert(element: TreeElement<T>, node: RTreeNode<T>): void {
        if (node.isLeaf) {
            node.addElement(element);
        } else {
            // Выбираем наилучший элемент для расширения MBR
            let bestFitElement: TreeElement<T> | undefined;
            let minAreaIncrease = Infinity;

            node.elements.forEach((childElement: TreeElement<T>) => {
                const currentMBR = childElement.getBoundingBox();
                const currentArea = currentMBR.area();

                const newMBR = new BoundingBox(
                    currentMBR.minX,
                    currentMBR.minY,
                    currentMBR.maxX,
                    currentMBR.maxY
                );
                newMBR.expandToInclude(element.shape);
                const areaIncrease = newMBR.area() - currentArea;

                if (areaIncrease < minAreaIncrease) {
                    minAreaIncrease = areaIncrease;
                    bestFitElement = childElement;
                }
            });

            if (bestFitElement && bestFitElement.child) {
                this._insert(element, bestFitElement.child);
                // Обновляем MBR родительского элемента
                bestFitElement.shape.getBoundingBox().expandToInclude(element.shape);

                if (bestFitElement.child.elements.length > this.maxEntries) {
                    const [left, right] = bestFitElement.child.split();
                    node.removeElement(bestFitElement);
                    if (left.getMBR()) {
                        node.addElement(new TreeElement<T>(left.getMBR()!, left, null));
                    }
                    if (right.getMBR()) {
                        node.addElement(new TreeElement<T>(right.getMBR()!, right, null));
                    }
                }
            } else {
                node.addElement(element);
            }
        }
    }

    private _splitRoot(): void {
        const [left, right] = this.root.split();
        const newRoot = new RTreeNode<T>(false);
        if (left.getMBR()) {
            newRoot.addElement(new TreeElement<T>(left.getMBR()!, left, null));
        }
        if (right.getMBR()) {
            newRoot.addElement(new TreeElement<T>(right.getMBR()!, right, null));
        }
        this.root = newRoot;
    }

    search(searchShape: Shape): T[] {
        const results: T[] = [];
        this._search(searchShape, this.root, results);
        return results;
    }

    private _search(searchShape: Shape, node: RTreeNode<T>, results: T[]): void {
        node.elements.forEach((element: TreeElement<T>) => {
            if (element.shape.intersects(searchShape)) {
                if (node.isLeaf && element.data !== null) {
                    results.push(element.data);
                } else if (element.child) {
                    this._search(searchShape, element.child, results);
                }
            }
        });
    }

    searchById(id: number): T | null {
        const element = this._searchElementById(id, this.root);
        return element ? element.data : null;
    }

    private _searchElementById(id: number, node: RTreeNode<T>): TreeElement<T> | null {
        for (const element of node.elements) {
            if (node.isLeaf && element.data !== null) {
                if (element.data.id === id) {
                    return element;
                }
            } else if (element.child) {
                const result = this._searchElementById(id, element.child);
                if (result !== null) {
                    return result;
                }
            }
        }
        return null;
    }

    deleteById(id: number): boolean {
        const path: RTreeNode<T>[] = [];
        const element = this._findElementById(id, this.root, path);
        if (element) {
            const leafNode = path[path.length - 1];
            leafNode.removeElement(element);
            this._condenseTree(path);
            if (this.root.elements.length === 0 && !this.root.isLeaf) {
                // Если корневой узел стал пустым, сделаем одним из детей новым корнем
                // @ts-ignore
                if (this.root.elements.length === 1 && this.root.elements[0].child) {
                    this.root = this.root.elements[0].child;
                    this.root.parent = null;
                }
            }
            return true;
        }
        return false;
    }

    private _findElementById(id: number, node: RTreeNode<T>, path: RTreeNode<T>[]): TreeElement<T> | null {
        for (const element of node.elements) {
            if (node.isLeaf && element.data !== null) {
                if (element.data.id === id) {
                    path.push(node);
                    return element;
                }
            } else if (element.child) {
                path.push(node);
                const result = this._findElementById(id, element.child, path);
                if (result !== null) {
                    return result;
                }
                path.pop();
            }
        }
        return null;
    }

    private _condenseTree(path: RTreeNode<T>[]): void {
        const Q: TreeElement<T>[] = [];
        for (let i = path.length - 1; i >= 0; i--) {
            const node = path[i];
            if (node !== this.root && node.elements.length < this.minEntries) {
                // Удаляем узел из родительского узла
                const parent = node.parent;
                if (parent) {
                    const parentElement = parent.elements.find(el => el.child === node);
                    if (parentElement) {
                        parent.removeElement(parentElement);
                    }
                }
                // Собираем элементы для повторной вставки
                Q.push(...node.elements);
            } else {
                // Обновляем MBR родительских узлов
                const mbr = node.getMBR();
                if (mbr && node.parent) {
                    const parentElement = node.parent.elements.find(el => el.child === node);
                    if (parentElement) {
                        parentElement.shape = mbr;
                    }
                }
            }
        }

        // Повторно вставляем элементы
        Q.forEach(element => {
            this._insert(element, this.root);
        });
    }

    updateById(id: number, newShape: Shape): boolean {
        const data = this.searchById(id);
        if (data) {
            this.deleteById(id);
            this.insert(data, newShape);
            return true;
        }
        return false;
    }

    printTree(): void {
        this._printNode(this.root, 0);
    }

    private _printNode(node: RTreeNode<T>, level: number): void {
        const indent = '  '.repeat(level);
        const mbr = node.getMBR();
        console.log(`${indent}${node.isLeaf ? 'Leaf' : 'Internal'} Node - Level ${level}`);
        if (mbr) {
            console.log(`${indent}  MBR: (${mbr.minX}, ${mbr.minY}) - (${mbr.maxX}, ${mbr.maxY})`);
        }
        console.log(`${indent}  Number of Elements: ${node.elements.length}`);
        node.elements.forEach((element, index) => {
            if (node.isLeaf) {
                console.log(`${indent}  Element ${index + 1}: ID=${element.data?.id}, Name=${element.data?.name}`);
            } else {
                console.log(`${indent}  Element ${index + 1}: ShapeType=${element.shape.constructor.name}`);
                if (element.child) {
                    this._printNode(element.child, level + 1);
                }
            }
        });
    }
}

interface DataObject {
    id: number;
    name: string;
}

const rtree = new RTree<DataObject>(8);
const objectArray: { data: DataObject; shape: Shape }[] = [];

function generateRandomShape(id: number): { data: DataObject; shape: Shape } {
    const data: DataObject = { id, name: `Object_${id}` };
    const shapeType = Math.floor(Math.random() * 3);

    if (shapeType === 0) {
        const x = Math.floor(Math.random() * 1000);
        const y = Math.floor(Math.random() * 1000);
        const width = Math.floor(Math.random() * 100) + 1;
        const height = Math.floor(Math.random() * 100) + 1;
        const boundingBox = new BoundingBox(x, y, x + width, y + height);
        return { data, shape: boundingBox };
    } else if (shapeType === 1) {
        const centerX = Math.floor(Math.random() * 1000);
        const centerY = Math.floor(Math.random() * 1000);
        const radius = Math.floor(Math.random() * 50) + 1;
        const circle = new Circle(centerX, centerY, radius);
        return { data, shape: circle };
    } else {
        const numPoints = Math.floor(Math.random() * 5) + 3;
        const points = [];
        for (let i = 0; i < numPoints; i++) {
            const x = Math.floor(Math.random() * 1000);
            const y = Math.floor(Math.random() * 1000);
            points.push({ x, y });
        }
        const polygon = new Polygon(points);
        return { data, shape: polygon };
    }
}

const TOTAL_OBJECTS = 2000;
console.time("Вставка элементов");
for (let i = 1; i <= TOTAL_OBJECTS; i++) {
    const obj = generateRandomShape(i);
    rtree.insert(obj.data, obj.shape);
    objectArray.push(obj);
}
console.timeEnd("Вставка элементов");

// Поиск объекта по ID до удаления
const searchId = 1000;
console.time(`Поиск объекта с ID ${searchId} в R-дереве`);
const foundById = rtree.searchById(searchId);
console.timeEnd(`Поиск объекта с ID ${searchId} в R-дереве`);

if (foundById) {
    console.log(`\nНайден объект с ID ${searchId}: Name: ${foundById.name}`);
} else {
    console.log(`\nОбъект с ID ${searchId} не найден в R-дереве.`);
}

// Удаление объектов из R-дерева
console.time(`Удаление объектов из R-дерева`);
for (let i = 10; i <= TOTAL_OBJECTS; i++) {
    const deleteId = i;
    const deleteResult = rtree.deleteById(deleteId);

    if (!deleteResult) {
        console.log(`\nОбъект с ID ${deleteId} не найден в R-дереве.`);
    }
}
console.timeEnd(`Удаление объектов из R-дерева`);

// Проверка оставшихся элементов
console.time("Проверка оставшихся элементов в R-дереве");
const remainingElements = rtree.search(new BoundingBox(-Infinity, -Infinity, Infinity, Infinity));
console.timeEnd("Проверка оставшихся элементов в R-дереве");

console.log(`\nОставшиеся объекты после удаления (должны быть с ID 1-9):`);
remainingElements.forEach(obj => {
    console.log(`- ID: ${obj.id}, Name: ${obj.name}`);
});

// Обновление элемента
const updateId = 5;
const newShape = new Circle(500, 500, 100);
console.time(`Обновление объекта с ID ${updateId} в R-дереве`);
const updateResult = rtree.updateById(updateId, newShape);
console.timeEnd(`Обновление объекта с ID ${updateId} в R-дереве`);

if (updateResult) {
    console.log(`\nОбъект с ID ${updateId} успешно обновлён в R-дереве.`);
} else {
    console.log(`\nОбъект с ID ${updateId} не найден в R-дереве.`);
}

// Вывод всего дерева в консоль
console.time("Вывод R-дерева в консоль");
rtree.printTree();
console.timeEnd("Вывод R-дерева в консоль");

function convertRTreeToJSON<T>(node: RTreeNode<T>, level: number = 0): any {
    const nodeType = node.isLeaf ? 'Leaf' : 'Internal';
    const mbr = node.getMBR();
    const elements = node.elements.map((element, index) => {
        const elementInfo: any = {
            index: index + 1,
            shapeType: element.shape.constructor.name,
            mbr: {
                minX: element.getBoundingBox().minX,
                minY: element.getBoundingBox().minY,
                maxX: element.getBoundingBox().maxX,
                maxY: element.getBoundingBox().maxY,
            },
        };

        if (node.isLeaf && element.data) {
            elementInfo.data = {
            // @ts-ignore
                id: element.data.id,
            // @ts-ignore
                name: element.data.name,
            };
        } else if (element.child) {
            elementInfo.child = convertRTreeToJSON(element.child, level + 1);
        }

        return elementInfo;
    });

    return {
        type: nodeType,
        level: level,
        mbr: mbr
            ? {
                minX: mbr.minX,
                minY: mbr.minY,
                maxX: mbr.maxX,
                maxY: mbr.maxY,
            }
            : null,
        elements: elements,
    };
}

const rtreeJson = convertRTreeToJSON(rtree.root);

const fs = require('fs');
fs.writeFileSync('rtree.json', JSON.stringify(rtreeJson, null, 2));
console.log("R-дерево сохранено в rtree.json");
