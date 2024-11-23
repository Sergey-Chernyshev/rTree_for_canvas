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
        return true;
    }

    contains(other: Shape): boolean {
        const otherBox = other.getBoundingBox();
        const thisBox = this.getBoundingBox();
        if (!thisBox.contains(otherBox)) {
            return false;
        }
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
        const mid = Math.floor(this.elements.length / 2);
        const leftElements = this.elements.slice(0, mid);
        const rightElements = this.elements.slice(mid);

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
                bestFitElement.shape.getBoundingBox().expandToInclude(element.shape);

                if (bestFitElement.child.elements.length > this.maxEntries) {
                    const [left, right] = bestFitElement.child.split();
                    node.elements = node.elements.filter((e: TreeElement<T>) => e !== bestFitElement);
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
        const path: { node: RTreeNode<T>; parentElement: TreeElement<T> | null }[] = [];
        const element = this._findElementById(id, this.root, path);
        if (element) {
            const leafNode = path[path.length - 1].node;
            leafNode.removeElement(element);

            this._condenseTree(path);

            if (this.root.elements.length === 1 && !this.root.isLeaf) {
                this.root = this.root.elements[0].child!;
            }

            return true;
        }
        return false;
    }

    private _findElementById(id: number, node: RTreeNode<T>, path: { node: RTreeNode<T>; parentElement: TreeElement<T> | null }[]): TreeElement<T> | null {
        for (const element of node.elements) {
            if (node.isLeaf && element.data !== null) {
                if (element.data.id === id) {
                    path.push({ node, parentElement: null });
                    return element;
                }
            } else if (element.child) {
                path.push({ node, parentElement: element });
                const result = this._findElementById(id, element.child, path);
                if (result !== null) {
                    return result;
                }
                path.pop();
            }
        }
        return null;
    }

    private _condenseTree(path: { node: RTreeNode<T>; parentElement: TreeElement<T> | null }[]): void {
        const eliminatedNodes: RTreeNode<T>[] = [];
        for (let i = path.length - 1; i >= 0; i--) {
            const { node, parentElement } = path[i];
            if (node !== this.root && node.elements.length < this.minEntries) {
                if (parentElement && node.parent) {
                    node.parent.removeElement(parentElement);
                }
                eliminatedNodes.push(node);
            } else {
                if (node.elements.length > 0) {
                    const mbr = node.getMBR();
                    if (parentElement) {
                        parentElement.shape = mbr!;
                    }
                }
            }
        }

        for (const node of eliminatedNodes) {
            for (const element of node.elements) {
                if (element.child) {
                    element.child.parent = null;
                }
                this._insert(element, this.root);
            }
        }
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

const TOTAL_OBJECTS = 200000;
console.time("Вставка элементов");
for (let i = 1; i <= TOTAL_OBJECTS; i++) {
    const obj = generateRandomShape(i);
    rtree.insert(obj.data, obj.shape);
    objectArray.push(obj);
}
console.timeEnd("Вставка элементов");

const searchShape = new BoundingBox(20, 20, 200, 200);
console.time("Поиск объектов в R-дереве");
const found = rtree.search(searchShape);
console.timeEnd("Поиск объектов в R-дереве");

console.time("Поиск объектов в массиве");
const foundInArray = objectArray.filter(obj => obj.shape.intersects(searchShape));
console.timeEnd("Поиск объектов в массиве");

console.log(`\nОбъекты, пересекающиеся с областью (${searchShape.minX}, ${searchShape.minY}) - (${searchShape.maxX}, ${searchShape.maxY}):`);
found.slice(0, 10).forEach(obj => {
    console.log(`- ID: ${obj.id}, Name: ${obj.name}`);
});
if (found.length > 10) {
    console.log(`... и ещё ${found.length - 10} объектов.`);
}

const searchId = 100000;
console.time(`Поиск объекта с ID ${searchId} в R-дереве`);
const foundById = rtree.searchById(searchId);
console.timeEnd(`Поиск объекта с ID ${searchId} в R-дереве`);

if (foundById) {
    console.log(`\nНайден объект с ID ${searchId}: Name: ${foundById.name}`);
} else {
    console.log(`\nОбъект с ID ${searchId} не найден в R-дереве.`);
}

const deleteId = 100000;
console.time(`Удаление объекта с ID ${deleteId} из R-дерева`);
const deleteResult = rtree.deleteById(deleteId);
console.timeEnd(`Удаление объекта с ID ${deleteId} из R-дерева`);

if (deleteResult) {
    console.log(`\nОбъект с ID ${deleteId} успешно удалён из R-дерева.`);
} else {
    console.log(`\nОбъект с ID ${deleteId} не найден в R-дереве.`);
}

const updateId = 150000;
const newShape = new Circle(500, 500, 100);
console.time(`Обновление объекта с ID ${updateId} в R-дереве`);
const updateResult = rtree.updateById(updateId, newShape);
console.timeEnd(`Обновление объекта с ID ${updateId} в R-дереве`);

if (updateResult) {
    console.log(`\nОбъект с ID ${updateId} успешно обновлён в R-дереве.`);
} else {
    console.log(`\nОбъект с ID ${updateId} не найден в R-дереве.`);
}

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
