import { keyable } from '~scripts/Background/types/IAssetsController';
import { Principal } from '@dfinity/principal';

export const shortenAddress = (address: string, startCut = 7, endCut = 4) => {
  return (
    address?.substring(0, startCut) +
    '...' +
    address?.substring(address.length - endCut, address.length)
  );
};

export const parseObjWithOutBigInt = (obj: keyable) =>
  obj && JSON.parse(stringifyWithBigInt(obj));

export const parseObjWithBigInt = (obj: keyable) =>
  obj &&
  JSON.parse(stringifyWithBigInt(obj), (_, value) => {
    if (typeof value === 'string' && value.startsWith('BigInt:')) {
      return BigInt(value.substr(7));
    }
    return value;
  });

export const stringifyWithBigInt = (obj: keyable) =>
  JSON.stringify(obj, (_, value) =>
    typeof value === 'bigint' ? 'BigInt:' + value.toString() : value
  );

export const safeParseJSON = (jsonString: string) => {
  // This function cannot be optimised, it's best to
  // keep it small!
  var parsed;

  try {
    parsed = JSON.parse(jsonString);
  } catch (e) {
    // Oh well, but whatever...
    parsed = jsonString;
  }

  return parsed; // Could be undefined!
};
/* 
GNU General Public License v3.0
https://github.com/Psychedelic/plug/blob/e4242a26f288556ee478ff9f4ac02d375d93c284/source/shared/utils/ids.js#L23

Modified version of parsePrincipalObj that deserializes serialized principal
*/

export const parsePrincipalObj = (data: keyable): keyable =>
  typeof data === 'object'
    ? Array.isArray(data)
      ? data.map((object) => parsePrincipalObj(object))
      : Object.entries(data).reduce((acum, [key, val]) => {
          const current: keyable = { ...acum };
          if (val._isPrincipal) {
            current[key] = Principal.fromUint8Array(
              new Uint8Array(Object.values(val._arr))
            );
          } else if (typeof val === 'object') {
            current[key] = parsePrincipalObj(val);
          } else {
            current[key] = val;
          }
          return current;
        }, {})
    : data;

const treat = (str: any, { replace = '' } = {}) => str.split(' ').join(replace);

//https://github.com/bukinoshita/share-twitter#readme
export const shareTweetURL = ({
  text,
  url,
  hashtags,
  via,
  related,
  replyTo,
}: {
  text?: string;
  url?: string;
  hashtags?: string;
  via?: string;
  related?: string;
  replyTo?: string;
}) => {
  const baseUrl = 'https://twitter.com/intent/tweet';
  const hasText = text ? `text=${treat(text, { replace: '%20' })}` : undefined;
  const hasUrl = url ? `url=${url}` : undefined;
  const hasHashtags = hashtags ? `hashtags=${treat(hashtags)}` : undefined;
  const hasVia = via ? `via=${via}` : undefined;
  const hasRelated = related ? `related=${related}` : undefined;
  const hasReplyTo = replyTo ? `in-reply-to=${replyTo}` : undefined;
  const arr = [hasText, hasUrl, hasHashtags, hasVia, hasRelated, hasReplyTo];
  const filtering = arr.filter(Boolean);
  const queries = filtering.join('&');

  return `${baseUrl}?${queries}`;
};
