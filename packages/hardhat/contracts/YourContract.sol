pragma solidity >=0.8.0 <0.9.0;

enum Direction {
    NORTH,
    EAST,
    SOUTH,
    WEST
}

struct Coord {
    int256 x;
    int256 y;
}

struct Collider {
    int256 width;
    Coord coord;
}

// We need to unify coords
contract YourContract {
    int256 constant PRECISION = 1 ether;
    int256 constant PLAYER_WIDTH = 0.5 ether;

    int256 constant MOVEMENT_SPEED = 0.25 ether;

    Collider[] public colliders;
    mapping(address => Collider) public positions;

    event NewPosition(address account, Coord position);
    event Destroy(uint256 index);

    function addColliders(Collider[] memory newColliders) external {
        for (uint256 i; i < newColliders.length; i++) {
            colliders.push(newColliders[i]);
        }
    }

    function move(Direction direction) external {
        Coord storage position = positions[msg.sender].coord;

        if (direction == Direction.NORTH) {
            position.y += MOVEMENT_SPEED;
        } else if (direction == Direction.EAST) {
            position.x += MOVEMENT_SPEED;
        } else if (direction == Direction.SOUTH) {
            position.y -= MOVEMENT_SPEED;
        } else {
            position.x -= MOVEMENT_SPEED;
        }

        for (uint256 i; i < colliders.length; i++) {
            Collider storage collider = colliders[i];

            require(
                position.x + PLAYER_WIDTH <=
                    collider.coord.x - collider.width ||
                    position.x - PLAYER_WIDTH >=
                    collider.coord.x + collider.width ||
                    position.y + PLAYER_WIDTH <=
                    collider.coord.y - collider.width ||
                    position.y - PLAYER_WIDTH >=
                    collider.coord.y + collider.width,
                "Collision with obstacle"
            );
        }

        emit NewPosition(msg.sender, position);
    }

    function shoot(Coord calldata pointer) external {
        Coord storage player = positions[msg.sender].coord;

        uint256 minIndex;
        int256 minDistance = 100000 ether;
        for (uint256 i; i < colliders.length; i++) {
            Collider storage collider = colliders[i];

            int256 leftX = collider.coord.x - collider.width;
            int256 rightX = collider.coord.x + collider.width;
            int256 bottomY = collider.coord.y - collider.width;
            int256 topY = collider.coord.y + collider.width;

            if (
                intersects(
                    player.x,
                    player.y,
                    pointer.x,
                    pointer.y,
                    leftX,
                    bottomY,
                    leftX,
                    topY
                ) ||
                intersects(
                    player.x,
                    player.y,
                    pointer.x,
                    pointer.y,
                    leftX,
                    bottomY,
                    rightX,
                    bottomY
                ) ||
                intersects(
                    player.x,
                    player.y,
                    pointer.x,
                    pointer.y,
                    rightX,
                    topY,
                    leftX,
                    topY
                ) ||
                intersects(
                    player.x,
                    player.y,
                    pointer.x,
                    pointer.y,
                    rightX,
                    topY,
                    rightX,
                    bottomY
                )
            ) {
                int256 euclid = distance(collider.coord, player);
                if (euclid < minDistance) {
                    minDistance = euclid;
                    minIndex = i;
                }
            }
        }

        // This doesn't always work as the centre of a square may be closer
        if (minDistance != 100000 ether) {
            colliders[minIndex].coord.x = 10000 ether;
            colliders[minIndex].coord.y = 10000 ether;

            emit Destroy(minIndex);
        }
    }

    function getObjects() external view returns (Collider[] memory) {
        return colliders;
    }

    function distance(Coord memory a, Coord memory b)
        private
        pure
        returns (int256 y)
    {
        int256 xDiff = a.x - b.x;
        int256 yDiff = a.y - b.y;

        return sqrt(xDiff * xDiff + yDiff * yDiff);
    }

    function sqrt(int256 x) private pure returns (int256 y) {
        int256 z = (x + 1) / 2;
        y = x;
        while (z < y) {
            y = z;
            z = (x / z + z) / 2;
        }
    }

    function intersects(
        int256 a,
        int256 b,
        int256 c,
        int256 d,
        int256 p,
        int256 q,
        int256 r,
        int256 s
    ) private pure returns (bool) {
        int256 det = (c - a) * (s - q) - (r - p) * (d - b);

        if (det == 0) {
            return false;
        } else {
            int256 lambda = (((s - q) * (r - a) + (p - r) * (s - b)) *
                PRECISION) / det;
            int256 gamma = (((b - d) * (r - a) + (c - a) * (s - b)) *
                PRECISION) / det;

            return
                (0 < lambda && lambda < PRECISION) &&
                (0 < gamma && gamma < PRECISION);
        }
    }
}
