class BoundingBox {
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

    intersects(other: BoundingBox): boolean {
        return !(
            this.maxX < other.minX ||
            this.minX > other.maxX ||
            this.maxY < other.minY ||
            this.minY > other.maxY
        );
    }

    contains(other: BoundingBox): boolean {
        return (
            this.minX <= other.minX &&
            this.maxX >= other.maxX &&
            this.minY <= other.minY &&
            this.maxY >= other.maxY
        );
    }

    expandToInclude(other: BoundingBox): void {
        this.minX = Math.min(this.minX, other.minX);
        this.minY = Math.min(this.minY, other.minY);
        this.maxX = Math.max(this.maxX, other.maxX);
        this.maxY = Math.max(this.maxY, other.maxY);
    }

    area(): number {
        return (this.maxX - this.minX) * (this.maxY - this.minY);
    }
}

class TreeElement<T> {
    boundingBox: BoundingBox;
    child: RTreeNode<T> | null;
    data: T | null;

    constructor(boundingBox: BoundingBox, child: RTreeNode<T> | null = null, data: T | null = null) {
        this.boundingBox = boundingBox;
        this.child = child;
        this.data = data;
    }

    isLeafElement(): boolean {
        return this.data !== null;
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

    addElement(entry: TreeElement<T>): void {
        this.elements.push(entry);
        if (entry.child) {
            entry.child.parent = this;
        }
    }

    getMBR(): BoundingBox | null {
        if (this.elements.length === 0) return null;
        const firstMBR = this.elements[0].boundingBox;
        const mbr = new BoundingBox(firstMBR.minX, firstMBR.minY, firstMBR.maxX, firstMBR.maxY);
        for (let i = 1; i < this.elements.length; i++) {
            mbr.expandToInclude(this.elements[i].boundingBox);
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

    insert(data: T, boundingBox: BoundingBox): void {
        const element = new TreeElement<T>(boundingBox, null, data);
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
                const currentArea = childElement.boundingBox.area();
                const newMBR = new BoundingBox(
                    childElement.boundingBox.minX,
                    childElement.boundingBox.minY,
                    childElement.boundingBox.maxX,
                    childElement.boundingBox.maxY
                );
                newMBR.expandToInclude(element.boundingBox);
                const areaIncrease = newMBR.area() - currentArea;

                if (areaIncrease < minAreaIncrease) {
                    minAreaIncrease = areaIncrease;
                    bestFitElement = childElement;
                }
            });

            if (bestFitElement && bestFitElement.child) {
                this._insert(element, bestFitElement.child);
                bestFitElement.boundingBox.expandToInclude(element.boundingBox);

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

    search(boundingBox: BoundingBox): T[] {
        const results: T[] = [];
        this._search(boundingBox, this.root, results);
        return results;
    }

    private _search(boundingBox: BoundingBox, node: RTreeNode<T>, results: T[]): void {
        node.elements.forEach((element: TreeElement<T>) => {
            if (element.boundingBox.intersects(boundingBox)) {
                if (node.isLeaf && element.data !== null) {
                    results.push(element.data);
                } else if (element.child) {
                    this._search(boundingBox, element.child, results);
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
const objectArray: { data: DataObject; boundingBox: BoundingBox }[] = [];

function generateRandomBoundingBox(id: number): { data: DataObject; boundingBox: BoundingBox } {
    const x = Math.floor(Math.random() * 1000);
    const y = Math.floor(Math.random() * 1000);
    const width = Math.floor(Math.random() * 100) + 1;
    const height = Math.floor(Math.random() * 100) + 1;
    const data: DataObject = { id, name: `Object_${id}` };
    const boundingBox = new BoundingBox(x, y, x + width, y + height);
    return { data, boundingBox };
}

const TOTAL_OBJECTS = 200000;
console.time("Вставка элементов");
for (let i = 1; i <= TOTAL_OBJECTS; i++) {
    const obj = generateRandomBoundingBox(i);
    rtree.insert(obj.data, obj.boundingBox);
    objectArray.push(obj);
}
console.timeEnd("Вставка элементов");

const searchBox = new BoundingBox(20, 20, 20, 20);
console.time("Поиск объектов в R-дереве");
const found = rtree.search(searchBox);
console.timeEnd("Поиск объектов в R-дереве");

console.time("Поиск объектов в массиве");
const foundInArray = objectArray.filter(obj => obj.boundingBox.intersects(searchBox));
console.timeEnd("Поиск объектов в массиве");

console.log(`\nОбъекты, пересекающиеся с областью (${searchBox.minX}, ${searchBox.minY}) - (${searchBox.maxX}, ${searchBox.maxY}):`);
found.slice(0, 10).forEach(obj => {
    console.log(`- ID: ${obj.id}, Name: ${obj.name}`);
});
if (found.length > 10) {
    console.log(`... и ещё ${found.length - 10} объектов.`);
}

function convertRTreeToJSON<T>(node: RTreeNode<T>, level: number = 0): any {
    const nodeType = node.isLeaf ? 'Leaf' : 'Internal';
    const mbr = node.getMBR();
    const elements = node.elements.map((element, index) => {
        const elementInfo: any = {
            index: index + 1,
            mbr: {
                minX: element.boundingBox.minX,
                minY: element.boundingBox.minY,
                maxX: element.boundingBox.maxX,
                maxY: element.boundingBox.maxY,
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
