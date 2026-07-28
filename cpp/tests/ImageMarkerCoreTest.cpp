#include "../ImageMarkerCore.h"

#include <cassert>
#include <limits>

int main() {
  using image_marker_core::fitWithinMax;

  const auto unchanged = fitWithinMax(20, 12, 20);
  assert(unchanged.width == 20 && unchanged.height == 12);

  const auto landscape = fitWithinMax(100, 80, 20);
  assert(landscape.width == 20 && landscape.height == 16);

  const auto portrait = fitWithinMax(80, 100, 20);
  assert(portrait.width == 16 && portrait.height == 20);

  const auto narrow = fitWithinMax(1000, 1, 10);
  assert(narrow.width == 10 && narrow.height == 1);

  const auto fractional = fitWithinMax(4000.4, 2000.2, 1000);
  assert(fractional.width == 1000 && fractional.height == 500);

  assert(fitWithinMax(0, 100, 20).width == 0);
  assert(fitWithinMax(100, 100, 0).height == 0);
  assert(
      fitWithinMax(std::numeric_limits<double>::infinity(), 100, 20).width ==
      0);
}
