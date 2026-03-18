import {
  getBadgePlacementId,
  type ProductBadgePlacementContext,
} from '~/lib/coveo/engine';

interface Badge {
  text: string;
  backgroundColor: string;
  textColor: string;
  iconUrl: string | null;
}

export interface BadgePlacement {
  placementId: string;
  badges: Badge[];
}

export type BadgePlacementContext = ProductBadgePlacementContext | null;

interface ProductBadgesProps {
  badgePlacements?: BadgePlacement[];
  context: BadgePlacementContext;
}

function BadgeList({badges}: {badges: Badge[]}) {
  return (
    <>
      {badges.map((badge, index) => (
        <div
          key={`${badge.text}-${index}`}
          className="inline-flex max-w-full items-center gap-1 rounded-md px-2 py-1 text-xs font-medium shadow-sm"
          style={{
            backgroundColor: badge.backgroundColor,
            color: badge.textColor,
          }}
        >
          <span className="truncate">{badge.text}</span>
          {badge.iconUrl && (
            <img
              src={badge.iconUrl}
              alt=""
              aria-hidden="true"
              className="h-4 w-4 shrink-0"
            />
          )}
        </div>
      ))}
    </>
  );
}

export function ProductBadges({
  badgePlacements = [],
  context,
}: ProductBadgesProps) {
  if (!context) {
    return null;
  }

  const matchingPlacement = badgePlacements.find(
    ({placementId}) => placementId === getBadgePlacementId(context),
  );

  if (!matchingPlacement?.badges.length) {
    return null;
  }

  return (
    <div className="pointer-events-none absolute left-2 top-2 z-[1] flex max-w-[calc(100%-1rem)] flex-wrap gap-2">
      <BadgeList badges={matchingPlacement.badges} />
    </div>
  );
}
