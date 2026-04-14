import { CORE_GENERATE_STYLES } from "../constants/tones";
import { GenerateReply, RefineType, Tone } from "../types";
import { summarizeText } from "../utils/format";

interface GeneratePayload {
  inputText: string;
  preferredTone?: Tone;
}

interface RefinePayload {
  inputText: string;
  currentReply: string;
  style: Tone;
  refineType: RefineType;
}

const NOTE_MAP: Record<Tone, string> = {
  礼貌委婉: "适合需要留关系但要拒绝的场景。",
  坚定直接: "直给边界，减少来回拉扯。",
  简短边界: "短句表达，不给过度解释空间。",
  温和留余地: "语气平和，但立场明确。",
  留痕确认: "适合需要书面确认责任边界。",
};

function getFocus(inputText: string): string {
  const compact = inputText.replace(/\s+/g, "");
  return summarizeText(compact, 18);
}

function buildReplyByStyle(inputText: string, style: Tone): string {
  const focus = getFocus(inputText);

  if (style === "礼貌委婉") {
    return `这件事我先不接了，当前我这边安排已满，暂时无法继续配合。${focus ? `关于“${focus}”后续可按原分工推进。` : ""}`;
  }
  if (style === "坚定直接") {
    return `这件事不在我负责范围内，我这边不承接。请按对应负责人流程处理。`;
  }
  if (style === "简短边界") {
    return "我这边不方便，也不参与这件事。请理解。";
  }
  if (style === "温和留余地") {
    return "我先不参与这件事，后续如果范围调整并提前沟通，我再评估是否配合。";
  }
  return "为避免误解，我先确认下：这项工作由对应负责人推进，我这边不接手。后续请在群里同步结论。";
}

function orderedStyles(preferredTone?: Tone): Tone[] {
  const base = [...CORE_GENERATE_STYLES];
  if (!preferredTone) {
    return base;
  }
  const index = base.findIndex((style) => style === preferredTone);
  if (index <= 0) {
    return base;
  }
  const picked = base[index];
  base.splice(index, 1);
  base.unshift(picked);
  return base;
}

function getRefineNote(refineType: RefineType): string {
  const notes: Record<RefineType, string> = {
    more_direct: "已强化直接度，减少模糊表达。",
    more_polite: "已加入缓冲语气，保持礼貌。",
    shorter: "已压缩成更短句式，便于直接发送。",
    wechat_style: "已调整为更贴近微信聊天口吻。",
    more_boundary: "已突出边界与责任归属。",
  };
  return notes[refineType];
}

function refineText(text: string, refineType: RefineType): string {
  if (refineType === "more_direct") {
    return text
      .replace("我先不接了", "我不接")
      .replace("暂时无法继续配合", "无法配合")
      .concat(" 请按职责处理。");
  }
  if (refineType === "more_polite") {
    return `辛苦理解一下，${text}`;
  }
  if (refineType === "shorter") {
    const compact = text.split("。").filter(Boolean)[0];
    return `${compact}。`;
  }
  if (refineType === "wechat_style") {
    return text.replace("我这边", "这边").replace("请理解", "感谢理解");
  }
  return `${text.replace(/。$/, "")}，边界就先按这个来。`;
}

class GenerateService {
  async generateReplies(payload: GeneratePayload): Promise<GenerateReply[]> {
    const inputText = payload.inputText.trim();
    if (!inputText) {
      throw new Error("请输入具体场景后再生成");
    }

    await new Promise((resolve) => {
      setTimeout(resolve, 380);
    });

    return orderedStyles(payload.preferredTone).map((style) => ({
      style,
      text: buildReplyByStyle(inputText, style),
      note: NOTE_MAP[style],
    }));
  }

  async refineReply(payload: RefinePayload): Promise<Pick<GenerateReply, "text" | "note">> {
    await new Promise((resolve) => {
      setTimeout(resolve, 260);
    });

    return {
      text: refineText(payload.currentReply, payload.refineType),
      note: getRefineNote(payload.refineType),
    };
  }
}

export const generateService = new GenerateService();
